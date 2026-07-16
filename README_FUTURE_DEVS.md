# ESUUQ Backend — Developer Documentation

## Overview
This backend powers the ESUUQ multi-vendor marketplace. It is built with **NestJS** (TypeScript), uses **PostgreSQL** (via TypeORM), **Redis** for caching/queues, and integrates with Stripe, AWS S3, SendGrid, Twilio, and Firebase for payments, storage, email, SMS, and push notifications.

---

## Tech Stack
- **Framework:** NestJS 10 (TypeScript)
- **Database:** PostgreSQL 15 + TypeORM
- **Cache/Queue:** Redis 7 + Bull
- **Auth:** JWT (access/refresh), Google OAuth
- **Payments:** Stripe (PaymentIntents, Connect)
- **File Storage:** AWS S3 (Needs to be implemented)
- **Email:** SendGrid
- **SMS:** Twilio (Testing Needed)
- **Push:** Firebase FCM
- **WebSockets:** Socket.IO
- **API Docs:** Swagger (http://localhost:3000/docs)

---

## Project Structure

```
src/
├── main.ts
├── app.module.ts
├── app.controller.ts
│
├── admin/
├── auth/
├── common/
│   ├── decorators/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   └── storage/
├── coupons/
├── database/
│   ├── entities/
│   ├── migrations/
│   ├── seeds/
│   ├── snake-naming.strategy.ts
│   └── typeorm.datasource.ts
├── delivery/
├── merchants/
├── notifications/
├── orders/
├── payments/
├── products/
├── reviews/
├── search/
├── sub-admin/
├── support/
├── types/
└── users/
```

> Note: Each main folder (e.g., `products/`, `orders/`, `merchants/`) contains its own controller, service, module, and often a `dto/` subfolder. The `database/entities/` folder contains all entity definitions. This structure is designed for modularity and clarity for new developers.

---

## Roles

### Customers
- Profile, addresses, wishlist, password change, track orders, deactivate, delete account

### Merchants
- Store registration, earnings dashboard, payout requests, order management, product management, bulk upload, inventory management, review monitoring, product promotions, store profile management 

### Admins
- Order monitoring, Platform stats, Product approval/management, merchant approval management, customer monitoring, coupon management, revenue analytics, driver partner (not implemented)

### Sub-Admin
- Review moderation, flagged content management, merchant approval, user management (warn, suspend), order dispute (stripe refund), Support ticket management (full workflow not discussed by client), activity logs, my reports

### Delivery_partner:
- Mobile app to be provided by client

## Key Modules & Features

### Authentication
- Register, login, OTP verification, Google OAuth, Forget Password, Reset Password
- JWT access (15m) & refresh (7d) tokens
- Refresh tokens stored hashed in DB, blacklisted on logout

### Products
- CRUD, search, inventory, low-stock alerts
- Product variants, images, featured flag
- cart, wishlist

### Orders
- Atomic creation (transactional)
- Status transitions, tracking, OTP delivery

### Payments
- Stripe PaymentIntents, Connect payouts, refunds

### Delivery
- OTP delivery confirmation (need to be tested after client provides delivery app)

### Reviews
- Verified purchase reviews, star ratings, merchant replies (need to be tested after client provides delivery app)

### Coupons
- Discount codes, validation, usage limits

### Search
- Full-text search, autocomplete, trending queries

### Notifications
- Email (SendGrid), SMS (Twilio), push (Firebase) -  Twilio needs to be tested after client provides env

### Admin
- Analytics, revenue reports, user/merchant management

### Support
- Support tickets, replies, notifications (support ticket needs to be tested)

---

## Database Entities (Main)
- **User**: All accounts (customer, merchant, driver, admin, subadmin)
- **Merchant**: Store info, balances, commission
- **Product**: Listings, variants, stock, images
- **Order**: Order + OrderItem (products in order)
- **Category**: Product categories
- **Review**: Product reviews
- **Coupon**: Discount codes
- **Wishlist**: Saved products
- **SupportTicket**: Support system

---

## API Endpoints (Summary)
- **Auth:** `/v1/auth/*` (register, login, OTP, refresh, logout, Google)
- **Products:** `/v1/products` (CRUD, search, filter)
- **Orders:** `/v1/orders` (create, status, tracking)
- **Payments:** `/v1/payments` (intent, webhook)
- **Delivery:** `/v1/delivery` (active, confirm-otp, WebSocket)
- **Admin:** `/v1/admin/*` (dashboard, users)
- **Support:** `/v1/support/*` (tickets)
(All API endpoints can be discovered byt visiting http://localhost:3000/docs)

---

## Design Decisions
- **ULID** for all PKs (sortable, URL-safe)
- **Atomic order creation** (transaction)
- **OTP** stored hashed in Redis (10min TTL)
- **Response envelope:** `{ success, data, timestamp }`
- **WebSocket auth:** JWT handshake
- **Role-based access control** (RBAC)

---

## How to Run (Dev)
1. `npm install`
2. Copy `.env.example` to `.env` and fill in values
3. `docker-compose up postgres redis -d`
4. `npm run migration:run`
5. `npm run start:dev`
6. Access API at `http://localhost:3000/v1` and docs at `/docs`

---

## Testing
- Unit: `npm run test`
- Coverage: `npm run test:cov`
- E2E: `npm run test:e2e`

---

## Deployment
- Build: `docker build -t esuuq-api .`
- Run: `docker-compose up -d`

---

## Onboarding Checklist for New Devs
- Read this README fully
- Review `src/` structure and main modules
- Check `.env.example` for required secrets
- Use Swagger docs for API reference
- See `docs/` for handoff and payment error guides
- Test API endpoints using postman collection and environment provided in the repo

---

## Further Docs
- See `docs/` for handoff, payment error handling, and architecture notes.
- See `database/entities/` for all entity definitions.
- See `database/migrations/` for schema.
- See `postman/` for Postman collections.

---

*Maintained by Maktech solution. Last updated: 2026-04-29.*
