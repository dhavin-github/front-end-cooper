const db = require('./src/db');

(async () => {
    try {
        const database = await db();
        console.log('Adding status column to transactions table...');
        try {
            await database.exec(`ALTER TABLE transactions ADD COLUMN status TEXT DEFAULT 'COMPLETED'`);
            console.log('Column added successfully.');
        } catch (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('Column already exists.');
            } else {
                throw err;
            }
        }
    } catch (error) {
        console.error('Migration failed:', error);
    }
})();
