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

// Execute Refund
router.post('/:id/settle/refund', async (req, res) => {
    const eventId = req.params.id;
    try {
        const db = await getDb();
        const settlementData = [];

        await db.run('BEGIN');
        try {
            const event = await db.get('SELECT pool_balance FROM events WHERE id = ?', eventId);
            let currentPool = event.pool_balance;

            const participants = await db.all('SELECT user_id FROM participants WHERE event_id = ?', eventId);

            for (const p of participants) {
                const depositRes = await db.get("SELECT SUM(amount) as val FROM transactions WHERE event_id = ? AND user_id = ? AND type = 'DEPOSIT'", eventId, p.user_id);
                const usedRes = await db.get("SELECT SUM(s.amount) as val FROM expense_splits s JOIN expenses e ON s.expense_id = e.id WHERE e.event_id = ? AND s.user_id = ?", eventId, p.user_id);
                const refundedRes = await db.get("SELECT SUM(amount) as val FROM transactions WHERE event_id = ? AND user_id = ? AND type = 'REFUND'", eventId, p.user_id);

                const deposit = depositRes.val || 0;
                const used = usedRes.val || 0;
                const refunded = refundedRes.val || 0;

                const net = deposit - used - refunded;

                // Fix floating point epsilon if needed, but for now simple check
                if (net > 0.01 && currentPool >= net) {
                    await db.run(`INSERT INTO transactions (event_id, user_id, type, amount, description) VALUES (?, ?, 'REFUND', ?, 'End Event Refund')`, eventId, p.user_id, net);
                    await db.run('UPDATE events SET pool_balance = pool_balance - ? WHERE id = ?', net, eventId);
                    currentPool -= net;
                    settlementData.push({ user_id: p.user_id, refund: net });
                }
            }
            await db.run('COMMIT');
            res.json({ success: true, refunds: settlementData });

        } catch (txnErr) {
            await db.run('ROLLBACK');
            throw txnErr;
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
