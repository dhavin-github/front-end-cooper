# Cooper - Collective Spend Control

Cooper is a shared event wallet system where users fund a pool upfront, and expenses are paid from that pool. It ensures no peer-to-peer payments and enforces pool limits.

## Architecture

- **Backend**: Node.js + Express + SQLite (Async Mode)
- **Frontend**: Next.js (App Router) + Tailwind CSS
- **Database**: SQLite (`cooper.db`) with relational schema (Events, Users, Transactions, Expenses).

## Core Features
1.  **Event Pools**: Users fund a central event wallet.
2.  **Expense Management**: Pay expenses from the pool, splitting costs logically among participants.
3.  **Settlement**: Automatically calculate refunds or shortfalls based on deposits vs usage.
4.  **Safety**: Pool cannot go negative (except for refund race conditions handled by transactions).

## Usage

### Prerequisites
- Node.js (v18+)

### Setup

1.  **Backend**
    ```bash
    cd server
    npm install
    node src/app.js
    ```
    Runs on `http://localhost:4000`.

2.  **Frontend**
    ```bash
    cd client
    npm install
    npm run dev
    ```
    Runs on `http://localhost:3000`.

## API Endpoints

- `GET /api/events` - List events
- `POST /api/events` - Create event
- `POST /api/events/:id/fund` - Deposit to pool
- `POST /api/events/:id/expenses` - Pay expense from pool
- `GET /api/events/:id/settle` - Get settlement summary
