const express = require('express');
const router = express.Router();
const getDb = require('../db');
const bcrypt = require('bcryptjs');


// List Events
router.get('/', async (req, res) => {
    try {
        const db = await getDb();
        const events = await db.all('SELECT * FROM events ORDER BY id DESC');
        res.json(events);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create Event
router.post('/', async (req, res) => {
    const { name, description, created_by } = req.body;

    try {
        const db = await getDb();
        let userId = created_by;

        // Auto-create user logic
        if (typeof created_by === 'string') {
            const user = await db.get('SELECT id FROM users WHERE email = ?', created_by);
            if (user) {
                userId = user.id;
            } else {
                const dummyHash = await bcrypt.hash('creator-user-' + Date.now(), 10);
                const result = await db.run('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)', created_by, created_by, dummyHash);
                userId = result.lastID;
            }
        }

        const result = await db.run('INSERT INTO events (name, description, created_by) VALUES (?, ?, ?)', name, description || '', userId);
        const eventId = result.lastID;

        // Add creator as ADMIN
        await db.run('INSERT INTO participants (event_id, user_id, role) VALUES (?, ?, ?)', eventId, userId, 'ADMIN');

        res.json({ id: eventId, name, description, created_by: userId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Event Details
router.get('/:id', async (req, res) => {
    const eventId = req.params.id;
    try {
        const db = await getDb();
        const event = await db.get('SELECT * FROM events WHERE id = ?', eventId);
        if (!event) return res.status(404).json({ error: 'Event not found' });

        const participants = await db.all(`
            SELECT u.id, u.name, u.email, p.role 
            FROM participants p 
            JOIN users u ON p.user_id = u.id 
            WHERE p.event_id = ?
        `, eventId);

        const transactions = await db.all('SELECT * FROM transactions WHERE event_id = ? ORDER BY timestamp DESC', eventId);
        const expenses = await db.all('SELECT * FROM expenses WHERE event_id = ? ORDER BY created_at DESC', eventId);

        res.json({ ...event, participants, transactions, expenses });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add Participant
router.post('/:id/participants', async (req, res) => {
    const { name, email } = req.body;
    const eventId = req.params.id;

    try {
        const db = await getDb();
        let user = await db.get('SELECT * FROM users WHERE email = ?', email);
        if (!user) {
            const dummyHash = await bcrypt.hash('invite-user-' + Date.now(), 10);
            const user_name = name || email.split('@')[0];
            const result = await db.run('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)', user_name, email, dummyHash);
            user = { id: result.lastID, name: user_name, email };
        }

        await db.run('INSERT INTO participants (event_id, user_id) VALUES (?, ?)', eventId, user.id);
        res.json(user);
    } catch (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'User already in event' });
        }
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
