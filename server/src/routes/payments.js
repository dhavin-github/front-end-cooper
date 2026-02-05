const express = require('express');
const router = express.Router();
const finternet = require('../services/finternetService');
const getDb = require('../db');

// POST /api/payments/create
router.post('/create', async (req, res) => {
    const { amount, eventId, userId, type } = req.body;

    if (!amount || !eventId || !userId) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const description = `Fund Pool for Event ${eventId}`;
        const metadata = { eventId, userId, type };

        // 1. Create Payment Intent
        // Finternet service now returns the raw API response data
        const apiResponse = await finternet.createPaymentIntent(
            amount,
            'USD', // Default to USD as per requirement
            metadata
        );

        // Handle various potential ID fields (id, paymentId, payment_intent_id) to be safe
        // Finternet API returns nested structure: { id, data: { id, paymentUrl, ... } }
        const intentId = apiResponse.id || apiResponse.data?.id || apiResponse.paymentId || apiResponse.payment_intent_id;
        const paymentUrl = apiResponse.paymentUrl || apiResponse.data?.paymentUrl || apiResponse.url || apiResponse.redirect_url;

        if (!intentId) {
            console.error('[PaymentRoute] ❌ API response missing ID:', apiResponse);
            return res.status(502).json({ error: 'Invalid response from payment provider' });
        }

        // 2. Store as PENDING transaction
        // Map payment type to transaction type
        let transactionType = 'DEPOSIT'; // Default for FUND_POOL
        if (type === 'PAY_EXPENSE') transactionType = 'EXPENSE';
        if (type === 'REFUND_USER') transactionType = 'REFUND';

        const db = await getDb();
        await db.run(
            `INSERT INTO transactions 
            (event_id, user_id, type, amount, description, payment_reference, status, timestamp) 
            VALUES (?, ?, ?, ?, ?, ?, 'PENDING', CURRENT_TIMESTAMP)`,
            eventId, userId, transactionType, amount, `Pending ${type}`, intentId
        );

        console.log('[PaymentRoute] 📝 PENDING transaction created:', intentId);
        console.log('[PaymentRoute] 📤 Sending to frontend:', { intentId, paymentUrl, status: apiResponse.status || apiResponse.data?.status });

        // Return standardized response to frontend
        res.json({
            success: true,
            intentId: intentId,
            paymentUrl: paymentUrl,
            status: apiResponse.status || apiResponse.data?.status // e.g., 'INITIATED'
        });

    } catch (err) {
        console.error('[PaymentRoute] Create Error:', err.message);
        // Do not crash, return error
        res.status(500).json({ error: err.message || 'Payment initialization failed' });
    }
});

// POST /api/payments/confirm
router.post('/confirm', async (req, res) => {
    const { intentId, eventId } = req.body;

    if (!intentId || !eventId) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log(`[PaymentRoute] 🔄 Confirming payment: ${intentId} for event ${eventId}`);

    try {
        const db = await getDb();

        // 1. Check if already completed (Idempotency)
        const txn = await db.get(
            'SELECT id, status, amount, user_id FROM transactions WHERE payment_reference = ?',
            intentId
        );

        if (!txn) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        if (txn.status === 'COMPLETED') {
            console.log('[PaymentRoute] ℹ️ Already completed:', intentId);
            return res.json({ success: true, message: 'Already processed', amount: txn.amount });
        }

        // 2. Call Finternet Service to Confirm (Escrow Proof)
        // This will throw if the external API fails/rejects
        await finternet.confirmPaymentIntent(intentId);

        // 3. Update Database (Atomic Transaction)
        await db.run('BEGIN');

        try {
            // Mark Transaction as COMPLETED
            await db.run(
                'UPDATE transactions SET status = ?, description = ? WHERE id = ?',
                'COMPLETED', 'Payment via Finternet', txn.id
            );

            // Update Event Pool Balance based on transaction type
            // DEPOSIT: Add to pool
            // EXPENSE/REFUND: Deduct from pool
            const balanceChange = txn.type === 'DEPOSIT' ? txn.amount : -txn.amount;

            await db.run(
                'UPDATE events SET pool_balance = pool_balance + ? WHERE id = ?',
                balanceChange, eventId
            );

            await db.run('COMMIT');

            console.log(`[PaymentRoute] ✅ Success. Type: ${txn.type}, Pool ${balanceChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(balanceChange)}`);
            res.json({ success: true, amount: txn.amount, type: txn.type });

        } catch (dbErr) {
            await db.run('ROLLBACK');
            throw dbErr;
        }

    } catch (err) {
        console.error('[PaymentRoute] Confirm Error:', err.message);
        res.status(500).json({
            error: 'Confirmation failed',
            details: err.message
        });
    }
});

module.exports = router;
