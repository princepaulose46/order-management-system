# 📦 Order Management System

A production-ready **E-commerce Order Processing API** built with Node.js, Express, TypeScript, and Prisma ORM.

## ✨ Features

- **Order CRUD** — Create, retrieve, list (with status filtering), and cancel orders
- **Automatic Order Processing** — Background cron job promotes `PENDING` → `PROCESSING` every 5 minutes
- **Swagger API Docs** — Interactive OpenAPI documentation at `/api-docs`
- **Layered Architecture** — Controller → Service → Prisma (clean separation of concerns)
- **Production Hardened** — Connection pooling, graceful shutdown, Decimal-safe pricing, native UUIDs
- **Integration Tests** — Full test suite with Jest + Supertest

## 🛠 Tech Stack

| Layer          | Technology                          |
| -------------- | ----------------------------------- |
| Runtime        | Node.js + TypeScript                |
| Framework      | Express 4                           |
| ORM            | Prisma 6 (PostgreSQL)               |
| Background Jobs| node-cron                           |
| API Docs       | swagger-jsdoc + swagger-ui-express  |
| Security & Limit| helmet + cors + express-rate-limit   |
| Distributed Store| ioredis + rate-limit-redis (optional)|
| Testing        | Jest + Supertest                    |

## 📁 Project Structure

```
src/
├── __tests__/           # Integration & security tests
├── config/
├── controllers/
├── docs/
├── errors/
├── jobs/
├── middleware/
│   ├── error.middleware.ts       # Global error handler
│   └── rate-limit.middleware.ts  # Distributed rate limiter (Redis/Memory)
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **PostgreSQL** ≥ 14
- **Redis** (Optional) — Required only for distributed rate limiting across multiple backend instances
- **npm** ≥ 9

### Checking if Redis is Running Locally

If you are using Redis for rate-limiting, you can verify it is active with these commands:

* **Via CLI**:
  ```bash
  redis-cli ping
  # Should return: PONG
  ```
* **macOS (Homebrew)**:
  ```bash
  brew services list | grep redis
  ```
* **Docker**:
  ```bash
  docker ps | grep redis
  ```
* **Linux (systemd)**:
  ```bash
  systemctl status redis-server
  ```

### Setup

```bash
# 1. Clone the repository
git clone <repo-url>
cd order-management-system

# 2. Install dependencies (auto-runs prisma generate via postinstall)
npm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env with your PostgreSQL credentials

# 4. Run database migrations
npm run prisma:migrate

# 5. Start the development server
npm run dev
```

The server starts at `http://localhost:3000` and Swagger docs are available at `http://localhost:3000/api-docs`.

## 📜 Available Scripts

| Script                 | Description                                          |
| ---------------------- | ---------------------------------------------------- |
| `npm run dev`          | Start dev server with nodemon (auto-reloads on file changes) |
| `npm run build`        | Compile TypeScript to `dist/`                        |
| `npm start`            | Run compiled production build                        |
| `npm test`             | Run integration tests (uses `.env.test`)             |
| `npm run prisma:migrate` | Create & apply a new migration (development)       |
| `npm run prisma:deploy`  | Apply pending migrations (production — non-interactive) |
| `npm run prisma:reset`   | Reset database & re-apply all migrations           |
| `npm run prisma:studio`  | Open Prisma Studio (visual DB browser)             |

## 📡 API Endpoints

| Method | Endpoint                  | Description                                                               |
| ------ | ------------------------- | ------------------------------------------------------------------------- |
| `POST` | `/api/orders`             | Create a new order                                                        |
| `GET`  | `/api/orders`             | List all orders (filtered by `?status=`, paginated by `?limit=` & `?page=`) |
| `GET`  | `/api/orders/:id`         | Get order by ID                                                           |
| `PUT`  | `/api/orders/:id/cancel`  | Cancel a pending order                                                    |
| `GET`  | `/health`                 | Health check                                                              |
| `GET`  | `/api-docs`               | Swagger UI                                                                |

### Example: Create an Order

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "John Doe",
    "items": [
      { "productName": "Wireless Headphones", "quantity": 2, "price": 49.99 },
      { "productName": "USB-C Cable", "quantity": 5, "price": 9.99 }
    ]
  }'
```

### Example: List Orders (Paginated)

```bash
curl "http://localhost:3000/api/orders?status=PENDING&limit=1&page=1"
```

Response:
```json
{
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "customerName": "John Doe",
      "status": "PENDING",
      "createdAt": "2026-06-26T22:20:00.000Z",
      "updatedAt": "2026-06-26T22:20:00.000Z",
      "items": [
        {
          "id": "f8e7d6c5-b4a3-2f1e-0d9c-8b7a6f5e4d3c",
          "orderId": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
          "productName": "Wireless Headphones",
          "quantity": 2,
          "price": "49.99"
        }
      ]
    }
  ],
  "meta": {
    "totalItems": 15,
    "page": 1,
    "limit": 1,
    "totalPages": 15
  }
}
```

## 🔄 Order Status Flow

```
PENDING ──(cron job)──▶ PROCESSING ──▶ SHIPPED ──▶ DELIVERED
   │
   └──(cancel)──▶ CANCELLED
```

- Orders start as `PENDING`
- A background cron job promotes `PENDING` → `PROCESSING` every 5 minutes
- Only `PENDING` orders can be cancelled

## 🧪 Testing

Tests run against a separate test database configured in `.env.test`.

```bash
# Create the test database first
createdb order_management_test

# Run migrations on the test database
dotenv -e .env.test -- npx prisma migrate deploy

# Run the test suite
npm test
```

## ⚙️ Production Deployment

```bash
# 1. Install dependencies & generate Prisma client
npm install

# 2. Apply migrations (non-interactive, safe for CI/CD)
npm run prisma:deploy

# 3. Build TypeScript
npm run build

# 4. Start the server
NODE_ENV=production npm start
```

### Production Configuration

| Setting             | Where                  | Recommendation                             |
| ------------------- | ---------------------- | ------------------------------------------ |
| Connection pool     | `DATABASE_URL` params  | `connection_limit` = max_db_conn / instances |
| Pool timeout        | `DATABASE_URL` params  | `pool_timeout=10` (seconds)                |
| Direct DB access    | `DIRECT_URL`           | Bypass pooler (PgBouncer) for migrations   |
| Graceful shutdown   | `server.ts`            | Built-in SIGTERM/SIGINT handlers (10s timeout) and Redis connection cleanup |
| Logging             | `prisma.ts`            | Verbose in dev, warn+error only in production |
| Distributed Rate Limiting | `.env` variables | Configure `REDIS_URL` or `REDIS_HOST` to enable shared rate limiting limits |
| Trust Proxy         | `TRUST_PROXY` var      | Set to `1`, `true`, or proxy IP to identify real client IPs behind load balancers |


## 📄 License

ISC
