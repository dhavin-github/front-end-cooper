const express = require('express');
const router = express.Router();
const getDb = require('../db');
const finternet = require('../services/finternetService');

// Fund Pool (Deposit)
router.post('/:id/fund', async (req, res) => {
    const eventId = req.params.id;
    const { user_id, amount } = req.body;

    if (amount <= 0) return res.status(400).json({ error: 'Amount must be positive' });

    try {
        const db = await getDb();

        // Manual Transaction (Finternet handled via /api/payments flow)
        await db.run('BEGIN');
        try {
            await db.run('UPDATE events SET pool_balance = pool_balance + ? WHERE id = ?', amount, eventId);

            const result = await db.run(`
                INSERT INTO transactions (event_id, user_id, type, amount, description) 
                VALUES (?, ?, 'DEPOSIT', ?, 'Pool Funding')
            `, eventId, user_id, amount);

            await db.run('COMMIT');

            const event = await db.get('SELECT pool_balance FROM events WHERE id = ?', eventId);
            res.json({ success: true, transaction_id: result.lastID, new_balance: event.pool_balance });
        } catch (txnErr) {
            await db.run('ROLLBACK');
            throw txnErr;
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create Expense
router.post('/:id/expenses', async (req, res) => {
    const eventId = req.params.id;
    const { description, amount, split_users } = req.body;

    if (amount <= 0) return res.status(400).json({ error: 'Amount must be positive' });

    try {
        const db = await getDb();
        const event = await db.get('SELECT pool_balance, status FROM events WHERE id = ?', eventId);

        if (event.status !== 'ACTIVE') return res.status(400).json({ error: 'Event is not active' });
        if (event.pool_balance < amount) return res.status(400).json({ error: 'Insufficient pool funds' });

        await db.run('BEGIN');
        try {
            // 1. Deduct from Pool
            await db.run('UPDATE events SET pool_balance = pool_balance - ? WHERE id = ?', amount, eventId);

            // 2. Add Expense
            const expResult = await db.run(`
                INSERT INTO expenses (event_id, description, amount) VALUES (?, ?, ?)
            `, eventId, description || 'Expense', amount);
            const expenseId = expResult.lastID;

            // 3. Add Splits
            if (!split_users || split_users.length === 0) throw new Error("Must select at least one participant to split");

            const amountPerUser = amount / split_users.length;
            for (const uid of split_users) {
                await db.run('INSERT INTO expense_splits (expense_id, user_id, amount) VALUES (?, ?, ?)', expenseId, uid, amountPerUser);
            }

            // 4. Ledger Entry (Pool Spend)
            await db.run(`
                INSERT INTO transactions (event_id, user_id, type, amount, description) 
                VALUES (?, NULL, 'EXPENSE', ?, ?)
            `, eventId, amount, description);

            await db.run('COMMIT');

            const updatedEvent = await db.get('SELECT pool_balance FROM events WHERE id = ?', eventId);
            res.json({ success: true, expense_id: expenseId, new_balance: updatedEvent.pool_balance });
        } catch (txnErr) {
            await db.run('ROLLBACK');
            throw txnErr;
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
