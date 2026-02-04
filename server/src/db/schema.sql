-- Users
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
);

-- Events
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    created_by INTEGER NOT NULL,
    status TEXT DEFAULT 'ACTIVE', -- ACTIVE, SETTLED
    pool_balance REAL DEFAULT 0.0 CHECK (pool_balance >= 0),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Participants
CREATE TABLE IF NOT EXISTS participants (
    event_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role TEXT DEFAULT 'MEMBER', -- ADMIN, MEMBER
    status TEXT DEFAULT 'ACTIVE',
    PRIMARY KEY (event_id, user_id),
    FOREIGN KEY (event_id) REFERENCES events(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL CHECK (amount > 0),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id)
);

-- Expense Splits
CREATE TABLE IF NOT EXISTS expense_splits (
    expense_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    FOREIGN KEY (expense_id) REFERENCES expenses(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    PRIMARY KEY (expense_id, user_id)
);

-- Ledger / Transactions
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    user_id INTEGER, -- NULL for EXPENSE
    type TEXT NOT NULL, -- DEPOSIT, EXPENSE, REFUND, SETTLEMENT
    amount REAL NOT NULL,
    status TEXT DEFAULT 'COMPLETED', -- PENDING, COMPLETED, FAILED
    description TEXT,
    payment_reference TEXT UNIQUE, -- For Idempotency
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- OTPs
CREATE TABLE IF NOT EXISTS otps (
    email TEXT NOT NULL,
    otp TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    PRIMARY KEY (email, otp)
);
