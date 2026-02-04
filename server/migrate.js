const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

async function migrate() {
    const db = await open({
        filename: './cooper.db',
        driver: sqlite3.Database
    });

    try {
        // Check if column exists
        const tableInfo = await db.all("PRAGMA table_info(transactions)");
        const hasPaymentRef = tableInfo.some(col => col.name === 'payment_reference');

        if (!hasPaymentRef) {
            console.log('Adding payment_reference column...');
            await db.exec('ALTER TABLE transactions ADD COLUMN payment_reference TEXT');
            console.log('✅ Column added successfully');
        } else {
            console.log('✓ payment_reference column already exists');
        }

        // Verify
        const verify = await db.all("PRAGMA table_info(transactions)");
        console.log('Current transactions schema:');
        verify.forEach(col => console.log(`  - ${col.name} (${col.type})`));

    } catch (err) {
        console.error('Migration error:', err);
    } finally {
        await db.close();
    }
}

migrate();
