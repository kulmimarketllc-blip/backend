# ESUUQ API — NestJS Backend

> Multi-vendor marketplace REST API powering the ESUUQ platform.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | NestJS 10 (TypeScript) |
| Database | PostgreSQL 15 + TypeORM |
| Cache / Queue | Redis 7 + Bull |
| Auth | JWT (access 15m + refresh 7d) + Google OAuth |
| Payments | Stripe (PaymentIntents + Connect) |
| File Storage | AWS S3 + CloudFront CDN |
| Email | SendGrid |
| SMS | Twilio |
| Push | Firebase FCM |
| WebSockets | Socket.IO (delivery tracking) |
| API Docs | Swagger / OpenAPI |

---

## Quick Start

### 1. Prerequisites

```bash
node >= 20
npm >= 10
Docker + Docker Compose
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

```bash
cp .env.example .env
# Fill in your values in .env
```

Minimum required for local dev:
```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=esuuq_db
DATABASE_USER=esuuq_user
DATABASE_PASSWORD=esuuq_dev_password
REDIS_HOST=localhost
JWT_SECRET=any-random-string-here
JWT_REFRESH_SECRET=another-random-string
```

### 4. Start Infrastructure

```bash
# Start PostgreSQL + Redis locally
docker-compose up postgres redis -d

# Wait for healthy, then run migrations
npm run migration:run

# Start API in dev mode (hot reload)
npm run start:dev
```

### 5. Access

| Service | URL |
|---------|-----|
| API | http://localhost:3000/v1 |
| Swagger Docs | http://localhost:3000/docs |
| Health Check | http://localhost:3000/v1/health |
| Redis UI | http://localhost:8081 |

---

## Project Structure

```
src/
├── main.ts                     # Bootstrap + Swagger + global config
├── app.module.ts               # Root module — wires everything
├── app.controller.ts           # Health check endpoint
│
├── auth/                       # Authentication module
│   ├── auth.module.ts
│   ├── auth.service.ts         # register, login, OTP, refresh, logout
│   ├── auth.controller.ts      # POST /auth/* endpoints
│   ├── strategies/
│   │   ├── jwt.strategy.ts     # JWT validation
│   │   ├── local.strategy.ts   # Email/password login
│   │   └── google.strategy.ts  # Google OAuth2
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   ├── local-auth.guard.ts
│   │   └── google-auth.guard.ts
│   └── dto/                    # RegisterDto, LoginDto, VerifyOtpDto...
│
├── users/                      # Customer account management
├── merchants/                  # Merchant store management
│
├── products/                   # Product listings
│   ├── products.service.ts     # CRUD + search + inventory
│   ├── products.controller.ts  # GET/POST/PUT/DELETE /products
│   └── dto/
│
├── orders/                     # Order lifecycle
│   ├── orders.service.ts       # Atomic create, status transitions
│   ├── orders.controller.ts
│   ├── orders.processor.ts     # Bull queue processor (async jobs)
│   └── dto/
│
├── payments/                   # Stripe integration
│   ├── payments.service.ts     # PaymentIntents, payouts, refunds
│   └── payments.controller.ts  # POST /payments/intent, webhook
│
├── delivery/                   # Driver operations
│   ├── delivery.service.ts
│   ├── delivery.controller.ts  # REST endpoints
│   └── delivery.gateway.ts     # WebSocket — live GPS tracking
│
├── notifications/              # Email, SMS, Push
│   └── notifications.service.ts
│
├── admin/                      # Platform administration
│
├── common/
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   ├── public.decorator.ts
│   │   └── roles.decorator.ts
│   ├── filters/
│   │   └── http-exception.filter.ts
│   └── interceptors/
│       └── transform.interceptor.ts
│
└── database/
    ├── entities/
    │   ├── base.entity.ts          # ULID PK, timestamps, soft delete
    │   ├── user.entity.ts
    │   ├── product.entity.ts
    │   ├── order.entity.ts         # Order + OrderItem
    │   └── supporting.entities.ts  # Merchant, Address, Category, Review, Wishlist
    └── migrations/
        └── 1710000000000-InitialSchema.ts
```

---

## Key Design Decisions

### ULID Primary Keys
All entities use [ULID](https://github.com/ulid/spec) instead of UUID — they're sortable by time, URL-safe, and avoid sequential ID enumeration attacks.

### Atomic Order Creation
`OrdersService.create()` runs inside a **TypeORM transaction** — stock deduction, order creation, and item saving either all succeed or all roll back.

### OTP Storage
OTPs are **bcrypt-hashed** before storage in Redis with a 10-minute TTL. The plain OTP is sent to the user once and never persisted.

### JWT Strategy
- **Access token**: 15-minute expiry, sent in `Authorization: Bearer` header
- **Refresh token**: 7-day expiry, stored in httpOnly cookie + hashed in DB
- On logout: refresh token blacklisted in Redis

### Response Envelope
All responses are wrapped by `TransformInterceptor`:
```json
{ "success": true, "data": { ... }, "timestamp": "2026-03-12T..." }
```

### WebSocket Auth
`DeliveryGateway` authenticates on connection via JWT in `socket.handshake.auth.token`. Drivers and customers are placed in dedicated Socket.IO rooms for targeted events.

---

## API Endpoints Summary

### Auth
```
POST   /v1/auth/register          Public
POST   /v1/auth/login             Public
POST   /v1/auth/verify-otp        Public
POST   /v1/auth/resend-otp/:id    Public
POST   /v1/auth/refresh           Public
POST   /v1/auth/logout            JWT
GET    /v1/auth/me                JWT
GET    /v1/auth/google            OAuth
```

### Products
```
GET    /v1/products               Public  — list + search + filter
GET    /v1/products/:id           Public
GET    /v1/products/slug/:slug    Public
POST   /v1/products               Merchant
PUT    /v1/products/:id           Merchant
PUT    /v1/products/:id/restock   Merchant
DELETE /v1/products/:id           Merchant
```

### Orders
```
POST   /v1/orders                 Customer
GET    /v1/orders                 Customer (own orders)
GET    /v1/orders/:id             Customer
GET    /v1/orders/:id/track       Customer
PUT    /v1/orders/:id/status      Merchant | Driver | Admin
```

### Payments
```
POST   /v1/payments/intent        Customer
POST   /v1/payments/webhook       Public (Stripe signature validated)
```

### Delivery
```
GET    /v1/delivery/active        Driver
POST   /v1/delivery/confirm-otp   Driver
WS     /delivery                  Socket.IO namespace
```

### Admin
```
GET    /v1/admin/dashboard        Admin
GET    /v1/admin/users            Admin
```

---

## Running Tests

```bash
# Unit tests
npm run test

# With coverage
npm run test:cov

# E2E tests
npm run test:e2e
```

---

## Production Deployment

```bash
# Build Docker image
docker build -t esuuq-api:latest .

# Run full stack
docker-compose up -d

# Run migrations in production
docker exec esuuq-api npm run migration:run
```

### AWS ECS deployment
Push to `main` → GitHub Actions → Docker build → ECR → ECS rolling deploy (zero downtime).
See `.github/workflows/deploy.yml` for the full pipeline.

---

## Environment Variables

See `.env.example` for the full list of required variables.

---

*ESUUQ Platform — Built with ❤️ in Savage, MN*
