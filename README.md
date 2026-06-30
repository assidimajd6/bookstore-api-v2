# Bookstore API

A NestJS + Prisma + PostgreSQL REST API for managing authors, books, customers, and orders, with JWT authentication and role-based access control.

## Tech Stack

- NestJS (TypeScript)
- PostgreSQL + Prisma ORM
- JWT authentication (Passport)
- bcrypt password hashing
- class-validator / class-transformer for request validation

## Prerequisites

- Node.js (v18+)
- PostgreSQL installed and running locally

## Setup

### 1. Clone and install dependencies

\`\`\`bash
git clone <repo-url>
cd bookstore-api-v2
npm install
\`\`\`

### 2. Create your `.env` file

Create a `.env` file in the project root with the following:

\`\`\`
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/bookstore"
JWT_SECRET="your-long-random-secret-string"
JWT_EXPIRES_IN="1h"
\`\`\`

The app will refuse to start if any of these are missing.

### 3. Set up the database

Make sure PostgreSQL is running and a `bookstore` database exists, then run:

\`\`\`bash
npx prisma migrate dev
\`\`\`

This applies all migrations and generates the Prisma Client.

### 4. Run the app

\`\`\`bash
npm run start:dev
\`\`\`

The API will be available at `http://localhost:3000`.

### 5. Verify it's working

\`\`\`bash
curl http://localhost:3000/health
\`\`\`

Should return `{ "status": "ok", "database": "connected" }`.

## Authentication

Most write endpoints require a JWT. Register, then log in to get a token:

\`\`\`bash
POST /auth/register
{ "email": "you@example.com", "password": "yourpassword123" }

POST /auth/login
{ "email": "you@example.com", "password": "yourpassword123" }
\`\`\`

Use the returned `access_token` as a Bearer token: `Authorization: Bearer <token>`.

## Endpoints

| Method | Path | Auth Required | Sample Request Body |
|---|---|---|---|
| POST | /auth/register | No | `{ "email": "a@b.com", "password": "min8chars" }` |
| POST | /auth/login | No | `{ "email": "a@b.com", "password": "min8chars" }` |
| GET | /auth/me | Yes (any user) | — |
| GET | /health | No | — |
| POST | /author | Yes (any user) | `{ "email": "a@b.com", "name": "Author Name", "bio": "optional" }` |
| GET | /author | No | — |
| GET | /author/:id/books | No | — |
| PATCH | /author/:id | Yes (any user) | `{ "name": "New Name" }` |
| DELETE | /author/:id | Yes (ADMIN only) | — |
| POST | /books | Yes (any user) | `{ "title": "...", "isbn": "...", "priceCents": 1999, "stock": 10, "authorId": 1 }` |
| GET | /books | No | Query params: `page`, `limit`, `authorId`, `search`, `sort` |
| GET | /books/:id | No | — |
| PATCH | /books/:id | Yes (any user) | `{ "stock": 5 }` |
| DELETE | /books/:id | Yes (ADMIN only) | — |
| POST | /customers | Yes (any user) | `{ "name": "...", "email": "..." }` |
| GET | /customers | No | — |
| GET | /customers/:id | No | — |
| PATCH | /customers/:id | Yes (any user) | `{ "name": "New Name" }` |
| POST | /orders | Yes (any user) | `{ "customerId": 1, "items": [{ "bookId": 1, "quantity": 2 }] }` |
| GET | /orders/:id | Yes (owner or ADMIN) | — |

## Notes

- Money is always stored as integer cents (`priceCents`, `unitPriceCents`) to avoid floating-point rounding errors.
- `OrderItem` snapshots the book's price at the time of purchase, so later price changes don't rewrite order history.
- Placing an order runs inside a database transaction: stock checks, stock decrement, and order creation either all succeed or all roll back together.