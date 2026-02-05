const express = require('express');
const router = express.Router();
const getDb = require('../db');
const finternet = require('../services/finternetService');

// Calculator
router.get('/:id/settle', async (req, res) => {
    // ...
    // (Kept unchanged)
    // ...
    const eventId = req.params.id;
    try {
        const db = await getDb();

        const participants = await db.all('SELECT user_id, u.name FROM participants p JOIN users u ON p.user_id = u.id WHERE p.event_id = ?', eventId);

        const deposits = await db.all(`
            SELECT user_id, SUM(amount) as total_deposited 
            FROM transactions 
            WHERE event_id = ? AND type = 'DEPOSIT' 
            GROUP BY user_id
        `, eventId);

        const usage = await db.all(`
            SELECT s.user_id, SUM(s.amount) as total_used 
            FROM expense_splits s 
            JOIN expenses e ON s.expense_id = e.id 
            WHERE e.event_id = ? 
            GROUP BY s.user_id
        `, eventId);

        const refunds = await db.all(`
            SELECT user_id, SUM(amount) as total_refunded 
            FROM transactions 
            WHERE event_id = ? AND type = 'REFUND' 
            GROUP BY user_id
        `, eventId);

        const userMap = {};
        participants.forEach(p => {
            userMap[p.user_id] = { id: p.user_id, name: p.name, deposited: 0, used: 0, refunded: 0, net: 0 };
        });

        deposits.forEach(d => { if (userMap[d.user_id]) userMap[d.user_id].deposited = d.total_deposited; });
        usage.forEach(u => { if (userMap[u.user_id]) userMap[u.user_id].used = u.total_used; });
        refunds.forEach(r => { if (userMap[r.user_id]) userMap[r.user_id].refunded = r.total_refunded; });

        Object.values(userMap).forEach(u => {
            u.net = u.deposited - u.used - u.refunded;
        });

        const event = await db.get('SELECT pool_balance, status FROM events WHERE id = ?', eventId);

        res.json({
            event_status: event.status,
            pool_balance: event.pool_balance,
            settlement: Object.values(userMap)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Execute Refund - Creates payment intents for all refunds
router.post('/:id/settle/refund', async (req, res) => {
    const eventId = req.params.id;
    try {
        const db = await getDb();
        const refundIntents = [];

        const event = await db.get('SELECT pool_balance FROM events WHERE id = ?', eventId);
        let currentPool = event.pool_balance;

        const participants = await db.all('SELECT user_id, u.name FROM participants p JOIN users u ON p.user_id = u.id WHERE event_id = ?', eventId);

        for (const p of participants) {
            // Get deposits - include both COMPLETED and those without status (old data)
            const depositRes = await db.get(
                `SELECT SUM(amount) as val FROM transactions 
                WHERE event_id = ? AND user_id = ? AND type = 'DEPOSIT' 
                AND (status = 'COMPLETED' OR status IS NULL)`,
                eventId, p.user_id
            );

            const usedRes = await db.get(
                `SELECT SUM(s.amount) as val FROM expense_splits s 
                JOIN expenses e ON s.expense_id = e.id 
                WHERE e.event_id = ? AND s.user_id = ?`,
                eventId, p.user_id
            );

            const refundedRes = await db.get(
                `SELECT SUM(amount) as val FROM transactions 
                WHERE event_id = ? AND user_id = ? AND type = 'REFUND' 
                AND status = 'COMPLETED'`,
                eventId, p.user_id
            );

            const deposit = depositRes.val || 0;
            const used = usedRes.val || 0;
            const refunded = refundedRes.val || 0;

            const net = deposit - used - refunded;

            console.log(`[Settlement] User ${p.name}: deposit=$${deposit}, used=$${used}, refunded=$${refunded}, net=$${net}, pool=$${currentPool}`);

            // Only create payment intent for users with positive balance
            if (net > 0.01 && currentPool >= net) {
                try {
                    // Create payment intent for refund through Finternet
                    const metadata = { eventId, userId: p.user_id, type: 'REFUND_USER' };
                    const apiResponse = await finternet.createPaymentIntent(
                        net,
                        'USD',
                        metadata
                    );

                    const intentId = apiResponse.id || apiResponse.data?.id;
                    const paymentUrl = apiResponse.paymentUrl || apiResponse.data?.paymentUrl;

                    if (!intentId) {
                        console.error('[Settlement] Failed to create refund intent for user:', p.user_id);
                        continue;
                    }

                    // Store as PENDING REFUND transaction
                    await db.run(
                        `INSERT INTO transactions 
                        (event_id, user_id, type, amount, description, payment_reference, status, timestamp) 
                        VALUES (?, ?, 'REFUND', ?, ?, ?, 'PENDING', CURRENT_TIMESTAMP)`,
                        eventId, p.user_id, net, `Refund to ${p.name}`, intentId
                    );

                    console.log(`[Settlement] ✅ Created refund intent for ${p.name}: $${net}`);

                    refundIntents.push({
                        user_id: p.user_id,
                        user_name: p.name,
                        amount: net,
                        intentId,
                        paymentUrl
                    });

                    currentPool -= net; // Reserve this from pool
                } catch (err) {
                    console.error(`[Settlement] ❌ Error creating refund intent for user ${p.user_id}:`, err.message);
                }
            } else {
                console.log(`[Settlement] ⏭️  Skipping ${p.name}: net=$${net} (needs > 0.01), pool=$${currentPool}`);
            }
        }

        if (refundIntents.length === 0) {
            return res.status(400).json({
                error: 'No refunds to process',
                details: 'No participants have positive balances to refund'
            });
        }

        res.json({
            success: true,
            refunds: refundIntents,
            message: `Created ${refundIntents.length} refund payment intents`
        });

    } catch (err) {
        console.error('[Settlement] Refund Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
