require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(bodyParser.json());

// Routes
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const transactionRoutes = require('./routes/transactions');
const settlementRoutes = require('./routes/settlement');
const paymentRoutes = require('./routes/payments'); // New
const authenticateToken = require('./middleware/authMiddleware'); // Inline/Extracted

// Validate Env
// Validate Env - STRICT check
if (!process.env.FINTERNET_API_KEY) {
    console.error('[Server] 🚨 FATAL: FINTERNET_API_KEY is missing in .env');
    console.error('[Server] Server cannot start without payment configuration.');
    process.exit(1);
} else {
    // Basic masking for log
    const key = process.env.FINTERNET_API_KEY;
    const masked = key.length > 8 ? key.substring(0, 4) + '...' + key.substring(key.length - 4) : '***';
    console.log(`[Server] ✅ Finternet API Key loaded: ${masked}`);
}

// Log Middleware import debug (Fixed via previous inline, so this might be different now)

app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes); // Mount Payments


// Protected Routes
app.use('/api/events', authenticateToken, eventRoutes);
app.use('/api/events', authenticateToken, transactionRoutes);
app.use('/api/events', authenticateToken, settlementRoutes);

// Utilities
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Global Error Handlers (Prevent Process Termination)
process.on('unhandledRejection', (reason, promise) => {
    console.error('[FATAL] Unhandled Promise Rejection:', reason);
    // Don't exit - log and continue
});

process.on('uncaughtException', (error) => {
    console.error('[FATAL] Uncaught Exception:', error);
    // Don't exit - log and continue
});

// Start Server
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;
