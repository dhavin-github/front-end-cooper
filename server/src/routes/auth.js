const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const getDb = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'hackathon-super-secret-key';

// Register
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });

    try {
        const db = await getDb();
        const existing = await db.get('SELECT id FROM users WHERE email = ?', email);
        if (existing) return res.status(400).json({ error: 'Email already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await db.run('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)', name, email, hashedPassword);

        res.json({ success: true, userId: result.lastID });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const db = await getDb();
        const user = await db.get('SELECT * FROM users WHERE email = ?', email);
        if (!user) return res.status(400).json({ error: 'Invalid credentials' });

        const validPass = await bcrypt.compare(password, user.password_hash);
        if (!validPass) return res.status(400).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '24h' });

        res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Request OTP
router.post('/request-otp', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    try {
        const db = await getDb();
        // Check user exists, if not create
        let user = await db.get('SELECT id FROM users WHERE email = ?', email);

        if (!user) {
            const name = email.split('@')[0]; // Use email prefix as name
            const dummyHash = await bcrypt.hash('otp-user-' + Date.now(), 10);
            const result = await db.run('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)', name, email, dummyHash);
            user = { id: result.lastID };
            console.log(`[Auth] Auto-created user ${email} (ID: ${user.id})`);
        }

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 10 * 60 * 1000; // 10 mins

        // Save OTP
        await db.run('INSERT INTO otps (email, otp, expires_at) VALUES (?, ?, ?)', email, otp, expiresAt);

        console.log(`[OTP] Generated for ${email}: ${otp}`); // Log for hackathon demo

        res.json({ success: true, message: 'OTP sent (check console)' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Missing fields' });

    try {
        const db = await getDb();

        // Find valid OTP
        const record = await db.get('SELECT * FROM otps WHERE email = ? AND otp = ?', email, otp);
        if (!record) return res.status(400).json({ error: 'Invalid OTP' });

        if (record.expires_at < Date.now()) {
            await db.run('DELETE FROM otps WHERE email = ?', email); // Cleanup
            return res.status(400).json({ error: 'OTP expired' });
        }

        // OTP Valid - Get User
        const user = await db.get('SELECT * FROM users WHERE email = ?', email);

        // Generate Token (Reuse existing JWT logic)
        const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '24h' });

        // Cleanup used OTP
        await db.run('DELETE FROM otps WHERE email = ? AND otp = ?', email, otp);

        res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

