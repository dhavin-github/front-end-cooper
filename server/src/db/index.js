const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const fs = require('fs');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../cooper.db');
const schemaPath = path.resolve(__dirname, 'schema.sql');

let dbInstance = null;

async function getDb() {
    if (dbInstance) return dbInstance;

    dbInstance = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    // Init Schema
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await dbInstance.exec(schema);

    return dbInstance;
}

module.exports = getDb;
