+-----------------------------------------------------------------------+
| **ESUUQ**                                                             |
|                                                                       |
| Developer Handoff Package                                             |
|                                                                       |
| Everything your developer needs to launch the platform                |
|                                                                       |
| March 2026 · Confidential                                             |
+-----------------------------------------------------------------------+

+-----------------+-----------------+-----------------+-----------------+
| **84**          | **9**           | **50+**         | **3**           |
|                 |                 |                 |                 |
| Code Files      | UI Screens      | API Endpoints   | Weeks to Launch |
| Ready           | Designed        | Built           |                 |
+-----------------+-----------------+-----------------+-----------------+

**1. What Is ESUUQ?**

ESUUQ is a multi-vendor online marketplace --- like Amazon, but built
for a specific community. Customers browse and buy products from
multiple sellers in one place. The platform handles everything:
payments, delivery tracking, merchant dashboards, and admin controls.

**The platform has 5 types of users:**

  --------------------------- -------------------------------------------
  **User Type**               **What They Do**

  **Customer**                Browses products, places orders, tracks
                              deliveries, leaves reviews

  **Merchant / Seller**       Lists products, manages orders, sees
                              earnings, requests payouts

  **Delivery Driver**         Picks up and delivers orders, confirms
                              delivery with a code

  **Admin**                   Manages the whole platform, approves
                              merchants, sees all revenue

  **Sub-Admin**               Helps admin with moderation and support
                              tasks
  --------------------------- -------------------------------------------

**2. What Has Already Been Built**

A significant amount of work is already done. Your developer is NOT
starting from scratch --- they are completing and deploying an existing
project.

**2a. All UI Screens (Front-End Designs)**

These are the visual screens --- what users actually see and click on.
All 9 are fully designed as HTML files, ready to be connected to the
backend.

  --------------------------- -------------------------------------------
  **File Name**               **What It Is**

  **esuuq.html**              Customer storefront --- browse products,
                              flash deals, categories

  **esuuq-cart.html**         Shopping cart and full 4-step checkout with
                              payment

  **esuuq-account.html**      Customer login, register, OTP verification,
                              full account dashboard

  **esuuq-merchant.html**     Merchant dashboard --- orders, products,
                              inventory, earnings, payouts

  **esuuq-admin.html**        Admin panel --- all users, merchants,
                              revenue, coupons, settings

  **esuuq-delivery.html**     Delivery driver mobile app --- accept jobs,
                              GPS tracking, OTP confirm

  **esuuq-api.html**          Full API documentation with all endpoints
                              and examples

  **esuuq-platform.html**     Master hub connecting all screens together

  **savana-cuisine.html**     Separate restaurant website (bonus project)
  --------------------------- -------------------------------------------

**2b. The Backend Code (Server / API)**

The backend is the brain of the app --- it handles logins, saves orders
to the database, processes payments, and more. This is delivered as
esuuq-api.tar.gz, a complete NestJS project with 84 TypeScript files.

  --------------------------- -------------------------------------------
  **Module**                  **What It Does**

  **Authentication**          Register, login, OTP verification, Google
                              login, refresh tokens

  **Users**                   Profile, addresses, wishlist, password
                              change

  **Merchants**               Store registration, earnings dashboard,
                              payout requests

  **Products**                Create, edit, search, inventory management,
                              low-stock alerts

  **Orders**                  Full order lifecycle from cart to
                              delivered, status tracking

  **Payments**                Stripe integration --- charge customers,
                              pay out merchants

  **Delivery**                Real-time GPS tracking via WebSockets, OTP
                              delivery confirmation

  **Reviews**                 Verified purchase reviews, star ratings,
                              merchant replies

  **Coupons**                 Create discount codes, validate at
                              checkout, usage limits

  **Search**                  Full-text search, autocomplete, trending
                              queries, related products

  **Notifications**           Email (SendGrid), SMS (Twilio), push
                              notifications (Firebase)

  **Admin**                   Platform analytics, revenue reports, health
                              alerts

  **File Uploads**            Product images and avatars uploaded
                              directly to AWS S3
  --------------------------- -------------------------------------------

**2c. The Database**

The database structure (schema) is fully designed and written as
migration files. The developer runs one command and all tables are
created automatically.

  --------------------------- -------------------------------------------
  **Table**                   **What It Stores**

  **users**                   All accounts --- customers, merchants,
                              drivers, admins

  **merchants**               Merchant stores, balances, commission rates

  **products**                All product listings with variants, images,
                              stock levels

  **categories**              12 pre-seeded categories (Electronics,
                              Fashion, etc.)

  **orders**                  Every order with full status history

  **order_items**             Individual products within each order

  **addresses**               Customer saved delivery addresses

  **reviews**                 Product reviews with ratings and merchant
                              replies

  **coupons**                 Discount codes with rules and usage
                              tracking

  **coupon_usages**           Record of every coupon redemption

  **wishlist**                Products customers have saved for later

  **search_logs**             Search queries for trending analytics
  --------------------------- -------------------------------------------

**3. What the Developer Needs to Do**

Below is a clear list of everything left to complete. Share this section
directly with any developer you hire.

**3a. Setup & Infrastructure (Days 1--3)**

  --------------------------- -------------------------------------------
  **Task**                    **Details**

  **Cloud server**            Set up on AWS, Railway, or Render to host
                              the API

  **PostgreSQL database**     Create a live database (AWS RDS or Supabase
                              recommended)

  **Redis cache**             Set up Redis (Upstash is free and easy)

  **Domain name**             Point your domain (e.g. esuuq.com) to the
                              server

  **SSL certificate**         Enable HTTPS so the site is secure (free
                              via Let\'s Encrypt)

  **Environment vars**        Fill in all API keys in the .env file (see
                              Section 5)
  --------------------------- -------------------------------------------

**3b. Third-Party Accounts to Create (Days 1--2)**

The developer will need credentials from these services. You should
create the accounts --- they are YOUR business accounts.

  --------------------------- -------------------------------------------
  **Service**                 **What It Is Used For**

  **Stripe**                  stripe.com --- for taking payments from
                              customers and paying merchants

  **SendGrid**                sendgrid.com --- for sending emails (order
                              confirmations, OTPs)

  **Twilio**                  twilio.com --- for sending SMS verification
                              codes

  **Firebase**                firebase.google.com --- for push
                              notifications on mobile

  **AWS S3**                  aws.amazon.com --- for storing product
                              images and photos

  **Google**                  console.cloud.google.com --- for Google
                              login and maps
  --------------------------- -------------------------------------------

**3c. Connect UI to Backend (Week 1--2)**

The screens and the backend code exist separately right now. The
developer needs to wire them together so that clicking \"Add to Cart\"
actually saves to the database, etc.

  --------------------------- -------------------------------------------
  **Screen**                  **What To Connect**

  **Login / Register**        Connect auth screens to /auth/register and
                              /auth/login endpoints

  **Product pages**           Load real products from the database via
                              /products endpoint

  **Cart & Checkout**         Connect to /orders and /payments/intent
                              endpoints

  **Merchant dashboard**      Connect earnings, orders, products to
                              merchant API endpoints

  **Admin panel**             Connect to /admin/dashboard and all admin
                              endpoints

  **Delivery app**            Connect to WebSocket gateway for live GPS
                              tracking

  **Search bar**              Connect to /search and /search/autocomplete
                              endpoints

  **Reviews**                 Connect review form to /reviews endpoint
  --------------------------- -------------------------------------------

**3d. Testing & Launch (Week 2--3)**

  --------------------------- -------------------------------------------
  **Task**                    **Details**

  **Test payments**           Run test transactions using Stripe test
                              mode

  **Test order flow**         Place an order end-to-end as a customer

  **Test merchant payout**    Request a payout as a merchant

  **Test delivery flow**      Complete a delivery with OTP confirmation

  **Mobile responsive**       Make sure everything works on phones

  **Go live**                 Switch Stripe to live mode, point domain to
                              server
  --------------------------- -------------------------------------------

**4. Technology Stack**

This is the list of technologies used. Share this when posting a job so
developers know exactly what skills are needed.

  ------------------ ------------------------------ ----------------------
  **Technology**     **Purpose**                    **Priority**

  NestJS             The main backend framework     Required skill
                     (Node.js)                      

  TypeScript         Programming language used      Required skill
                     throughout                     

  PostgreSQL         The main database              Required skill

  TypeORM            Connects the code to the       Required skill
                     database                       

  Redis              Fast caching and job queues    Required skill

  Stripe             Payments and merchant payouts  Required skill

  AWS S3             Stores uploaded images         Nice to have

  Socket.IO          Real-time delivery GPS         Required skill
                     tracking                       

  SendGrid           Sends emails                   Nice to have

  Twilio             Sends SMS messages             Nice to have

  Firebase FCM       Mobile push notifications      Nice to have

  Docker             Packages the app for           Nice to have
                     deployment                     

  JWT                Secure login tokens            Required skill
  ------------------ ------------------------------ ----------------------

**5. Complete List of API Endpoints**

These are all the \"routes\" the backend responds to. Each one does a
specific job. Your developer will recognise these immediately.

**Authentication**

  --------------------------- -------------------------------------------
  **Endpoint**                **What It Does**

  **POST /auth/register**     Create a new account

  **POST /auth/login**        Log in with email and password

  **POST /auth/verify-otp**   Verify the 6-digit code sent by SMS/email

  **POST                      Resend the verification code
  /auth/resend-otp/:id**      

  **POST /auth/refresh**      Get a new login token

  **POST /auth/logout**       Log out

  **GET /auth/me**            Get the currently logged-in user

  **GET /auth/google**        Start Google login
  --------------------------- -------------------------------------------

**Products & Search**

  --------------------------- -------------------------------------------
  **Endpoint**                **What It Does**

  **GET /products**           Browse all products with filters

  **GET /products/:id**       Get one product by ID

  **GET                       Get one product by its URL name
  /products/slug/:slug**      

  **POST /products**          Create a product (merchants only)

  **PUT /products/:id**       Update a product

  **PUT                       Update stock quantity
  /products/:id/restock**     

  **DELETE /products/:id**    Remove a product

  **GET /search**             Search products with full filters

  **GET                       Suggestions as user types
  /search/autocomplete**      

  **GET /search/trending**    Most searched terms today

  **GET /search/related/:id** Products similar to this one

  **GET                       Browse a category
  /search/category/:slug**    
  --------------------------- -------------------------------------------

**Orders & Payments**

  --------------------------- -------------------------------------------
  **Endpoint**                **What It Does**

  **POST /orders**            Place a new order

  **GET /orders**             List my orders

  **GET /orders/:id**         Get one order

  **GET /orders/:id/track**   Live tracking for an order

  **PUT /orders/:id/status**  Update order status

  **POST /payments/intent**   Create a Stripe payment

  **POST /payments/webhook**  Stripe sends payment confirmations here

  **POST /coupons/validate**  Check if a coupon code is valid
  --------------------------- -------------------------------------------

**Users, Merchants & Reviews**

  --------------------------- -------------------------------------------
  **Endpoint**                **What It Does**

  **GET /users/me**           Get my profile

  **PUT /users/me**           Update my profile

  **GET /users/me/addresses** List my saved addresses

  **POST                      Add a new address
  /users/me/addresses**       

  **GET /users/me/wishlist**  Get my saved products

  **POST                      Add/remove product from wishlist
  /users/me/wishlist/:id**    

  **POST                      Register a new store
  /merchants/register**       

  **GET                       Merchant earnings dashboard
  /merchants/me/earnings**    

  **POST                      Request a bank payout
  /merchants/me/payout**      

  **POST /reviews**           Leave a product review

  **GET                       See all reviews for a product
  /reviews/product/:id**      

  **POST                      Mark a review as helpful
  /reviews/:id/helpful**      

  **GET /delivery/active**    Driver: get current delivery job

  **POST                      Driver: confirm delivery with code
  /delivery/confirm-otp**     
  --------------------------- -------------------------------------------

**6. Environment Variables Needed**

These are the \"secret keys\" the app needs to connect to external
services. Your developer will need you to provide these after you create
accounts on each service.

  ----------------------- ------------------------------ --------------------------
  **Variable Name**       **What It Is**                 **Where to Get It**

  DATABASE_URL            Your PostgreSQL database       From your database host
                          address                        

  REDIS_URL               Your Redis cache address       From Upstash or Railway

  JWT_SECRET              A random secret string for     Developer generates this
                          login security                 

  JWT_REFRESH_SECRET      A second random secret string  Developer generates this

  STRIPE_SECRET_KEY       Stripe payment secret key      From stripe.com dashboard

  STRIPE_WEBHOOK_SECRET   Stripe webhook signing secret  From stripe.com dashboard

  SENDGRID_API_KEY        SendGrid email API key         From sendgrid.com

  SENDGRID_FROM_EMAIL     Your email address emails come You decide (e.g.
                          from                           hello@esuuq.com)

  TWILIO_ACCOUNT_SID      Twilio account ID              From twilio.com dashboard

  TWILIO_AUTH_TOKEN       Twilio secret token            From twilio.com dashboard

  TWILIO_FROM_NUMBER      Your Twilio phone number for   From twilio.com dashboard
                          SMS                            

  AWS_ACCESS_KEY_ID       AWS access key for S3 file     From aws.amazon.com
                          uploads                        

  AWS_SECRET_ACCESS_KEY   AWS secret key                 From aws.amazon.com

  AWS_S3_BUCKET           Name of your S3 storage bucket You name it (e.g.
                                                         esuuq-images)

  GOOGLE_CLIENT_ID        Google login app ID            From
                                                         console.cloud.google.com

  GOOGLE_CLIENT_SECRET    Google login secret            From
                                                         console.cloud.google.com
  ----------------------- ------------------------------ --------------------------

**7. Ready-to-Post Job Description**

Copy and paste this into Upwork, Fiverr, or any freelance platform to
hire a developer quickly.

+-----------------------------------------------------------------------+
| **Job Title: NestJS Developer --- Deploy & Connect Multi-Vendor       |
| Marketplace**                                                         |
|                                                                       |
| **About the project:**                                                |
|                                                                       |
| I am building ESUUQ, a multi-vendor online marketplace. The good      |
| news: most of the work is already done. I have 84 backend code files  |
| (NestJS/TypeScript), a full database schema with migrations, and 9    |
| designed UI screens ready to go. I need an experienced NestJS         |
| developer to deploy this and connect the frontend to the backend.     |
|                                                                       |
| **What you will do:**                                                 |
|                                                                       |
| -   Deploy the NestJS API to a cloud server (AWS, Railway, or Render) |
|                                                                       |
| -   Set up PostgreSQL database and run the existing migrations        |
|                                                                       |
| -   Configure all third-party services (Stripe, SendGrid, Twilio,     |
|     Firebase, AWS S3)                                                 |
|                                                                       |
| -   Connect the 9 HTML/CSS UI screens to the live API endpoints       |
|                                                                       |
| -   Set up a domain name with SSL (HTTPS)                             |
|                                                                       |
| -   Test the full order flow end-to-end                               |
|                                                                       |
| -   Hand over with documentation                                      |
|                                                                       |
| **Required skills:**                                                  |
|                                                                       |
| -   NestJS and TypeScript (required)                                  |
|                                                                       |
| -   PostgreSQL and TypeORM (required)                                 |
|                                                                       |
| -   Stripe payments integration (required)                            |
|                                                                       |
| -   Redis, JWT authentication, REST APIs (required)                   |
|                                                                       |
| -   HTML/CSS/JavaScript frontend integration (required)               |
|                                                                       |
| -   AWS or similar cloud deployment (required)                        |
|                                                                       |
| *Timeline: 2-3 weeks. Budget: Open to proposals. Please share         |
| examples of similar marketplace or NestJS projects you have           |
| deployed.*                                                            |
+-----------------------------------------------------------------------+

**8. Handoff Checklist**

Use this to track what you have shared with your developer.

**Files to send your developer:**

-   esuuq-api.tar.gz --- the complete backend code (the most important
    file)

-   esuuq.html --- customer storefront screen

-   esuuq-cart.html --- checkout screen

-   esuuq-account.html --- login and account screen

-   esuuq-merchant.html --- merchant dashboard screen

-   esuuq-admin.html --- admin panel screen

-   esuuq-delivery.html --- driver app screen

-   esuuq-api.html --- API documentation

-   esuuq-platform.html --- platform hub screen

-   This document --- full context and instructions

**Accounts to create before developer starts:**

-   Stripe account at stripe.com (for payments)

-   SendGrid account at sendgrid.com (for emails)

-   Twilio account at twilio.com (for SMS)

-   AWS account at aws.amazon.com (for image storage)

-   Google Cloud account at console.cloud.google.com (for Google login)

-   Firebase account at firebase.google.com (for push notifications)

-   Domain name purchased (e.g. esuuq.com from Namecheap or GoDaddy)

**Questions to ask a developer before hiring:**

-   Can you show me a NestJS project you have deployed before?

-   Have you integrated Stripe payments before?

-   How long will this take and what is your rate?

-   Will you provide documentation when finished?

-   How do I contact you if something breaks after launch?

ESUUQ Marketplace · Developer Handoff Package · Confidential

Prepared with Claude AI · March 2026
