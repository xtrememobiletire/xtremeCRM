# XtremeCRM Backend

Production-ready backend API service for **XtremeCRM** — dispatch, fleet management, and operational billing platform for 24/7 mobile tire repair and emergency roadside automotive services across Canada (CAD), the United States (USD), and the United Kingdom (GBP).

---

## 1. Directory Structure

`	ext
backend/
├── prisma/
│   ├── schema.prisma              # Database models & enums
│   ├── migrations/                # Prisma migration history
│   └── seed.ts                    # Database seeding script
│
├── src/
│   ├── config/
│   │   ├── database.ts            # Prisma client instance & extensions
│   │   ├── passport.ts            # Passport JWT strategy setup
│   │   ├── multer.ts              # File upload config
│   │   ├── socket.ts              # Socket.io setup
│   │   └── env.ts                 # Environment variables config
│   │
│   ├── middleware/
│   │   ├── auth.ts                # Passport authentication
│   │   ├── authorize.ts           # Role-based authorization
│   │   ├── validateRequest.ts     # Zod validation wrapper
│   │   ├── tenantScope.ts         # Country code tenant scoping
│   │   └── errorHandler.ts        # Centralized error handling
│   │
│   ├── routes/
│   │   ├── auth.routes.ts         # Login, register, logout
│   │   ├── users.routes.ts        # User management
│   │   ├── customers.routes.ts    # Customer CRUD
│   │   ├── jobs.routes.ts         # Job/dispatch operations
│   │   ├── vehicles.routes.ts     # Vehicle management
│   │   ├── fleets.routes.ts       # Fleet accounts
│   │   ├── invoices.routes.ts     # Invoice generation
│   │   ├── accounting.routes.ts   # Expense stating & reconciliation
│   │   ├── telephony.routes.ts    # Telnyx token & webhooks
│   │   ├── health.routes.ts       # Health check ping
│   │   └── index.ts               # Route aggregator
│   │
│   ├── controllers/
│   │   ├── authController.ts
│   │   ├── jobController.ts
│   │   ├── customerController.ts
│   │   ├── accountingController.ts
│   │   ├── telephonyController.ts
│   │   └── health.controller.ts
│   │
│   ├── services/
│   │   ├── authService.ts         # Business logic for auth
│   │   ├── jobService.ts          # Job operations & calculations
│   │   ├── customerService.ts     # Customer lookups
│   │   ├── pricingService.ts      # Tax & pricing calculations
│   │   ├── distanceService.ts     # Google Distance Matrix API
│   │   ├── telnyxService.ts       # Telnyx WebRTC tokens
│   │   ├── invoiceService.ts      # PDF generation
│   │   └── health.service.ts      # Database ping check
│   │
│   ├── schemas/                   # Zod validation schemas
│   │   ├── auth.schema.ts
│   │   ├── job.schema.ts
│   │   ├── customer.schema.ts
│   │   ├── accounting.schema.ts
│   │   └── common.schema.ts
│   │
│   ├── types/
│   │   ├── express.d.ts           # Express Request extensions
│   │   └── common.ts              # Shared types
│   │
│   ├── utils/
│   │   ├── currency.ts            # Cents ↔ dollars conversion
│   │   ├── logger.ts              # Structured logger
│   │   ├── async.ts               # Async error wrapper
│   │   ├── validators.ts          # Custom validation helpers
│   │   └── apiResponse.ts         # Standard API responses
│   │
│   ├── sockets/
│   │   ├── dispatchHandler.ts     # Real-time dispatch events
│   │   ├── driverHandler.ts       # Driver status updates
│   │   ├── chatHandler.ts         # Job-specific chat rooms
│   │   └── index.ts               # Socket aggregator & init
│   │
│   ├── app.ts                     # Express app setup & middleware
│   └── server.ts                  # HTTP & Socket.io server entry
│
├── uploads/                       # File storage (gitignored)
│   ├── receipts/
│   │   ├── customer/
│   │   └── materials/
│   ├── invoices/
│   └── seed/
│       ├── customer/
│       └── material/
│
├── .env                           # Environment variables
├── .env.example                   # Template
├── tsconfig.json                  # TypeScript config
├── package.json
└── README.md
`

---

## 2. Tech Stack

- **Runtime & Framework:** Node.js (v22+) + Express v5 + TypeScript 5.9.x
- **Database & ORM:** PostgreSQL (Neon / Dokploy) + Prisma ORM v7 with @prisma/adapter-pg
- **Real-Time Communication:** Socket.io (dispatch & telemetry rooms)
- **Validation:** Zod (type-safe request & schema validation)
- **Security:** Helmet, CORS, Cookie-Parser, Passport-JWT, Bcrypt
- **Process & Tooling:** TSX, PNPM

---

## 3. Scripts

| Command | Action |
| :--- | :--- |
| pnpm dev | Starts development server with hot-reload via 	sx watch src/server.ts |
| pnpm build | Generates Prisma client and compiles TypeScript to dist/ |
| pnpm start | Runs compiled production server via 
ode dist/server.js |
| pnpm prisma:generate | Generates Prisma ORM client artifacts |
| pnpm prisma:push | Pushes Prisma schema changes directly to the database |
| pnpm prisma:migrate | Runs declarative development migrations |
| pnpm prisma:studio | Opens interactive web GUI for exploring database records |
| pnpm prisma db seed | Executes prisma/seed.ts to seed initial admin user |
