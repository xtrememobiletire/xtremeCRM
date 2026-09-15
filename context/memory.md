# Project Memory & Session State — XtremeCRM

## 1. Project Overview
- **Project Name:** XtremeCRM
- **Domain:** Mobile Tire Repair, Seasonal Tire Swapping, and Emergency Roadside Assistance CRM & Real-Time Dispatching.
- **Operating Regions:** Canada (CAD), United States (USD), United Kingdom (GBP).
- **Brand Identity:** High-contrast Red & White theme (`#DC2626` & `#FFFFFF`), clean, fast, automotive roadside emergency aesthetic.

---

## 2. Confirmed Technology Stack
- **Backend API:** **Express (Node.js + TypeScript)** equipped with standard, high-performance middleware:
  - `helmet`: Secure HTTP response headers.
  - `cors`: Cross-Origin Resource Sharing with credentials support.
  - `morgan`: Formatted HTTP request logger.
  - `cookie-parser`: Signed cookie extraction for HttpOnly auth tokens.
  - `passport` + `passport-jwt`: Authentication and role-based guards.
  - `bcrypt`: Salt generation and password hashing.
  - `multer`: Multi-part form-data handling for customer and supplier receipt uploads.
  - `zod`: Single-source request schema validation (`validateRequest`) and TypeScript type inference.
  - Centralized error handling middleware.
- **Database & ORM:** **PostgreSQL 16** with **Prisma ORM** — Single database in Dokploy with indexed `countryCode` tenant scoping via Express tenant middleware and Prisma Client Extensions (`prisma.$extends`).
- **Real-Time Communication:** **Socket.io / SSE** — Persistent bidirectional connections with scoped rooms (`dispatch:{region}`, `driver:{driverId}`, `chat:job:{jobId}`, `accountant:{region}`).
- **Telephony Integration:** **Telnyx WebRTC & Webhooks** — Real-time screen pops on active agent screens with caller phone number pre-filled.
- **Frontend SPA:** **React 18 + Vite** + **Tailwind CSS** (Red & White design tokens).
- **Client UI State:** **Zustand** — Ephemeral UI controls (drawers, modals, filters, active/inactive agent toggle).
- **Server State / Cache:** **TanStack Query v5** — Automatic cache invalidation upon socket events.
- **Hosting & Infrastructure:** **Dokploy** on Hostinger 16GB KVM VPS — Docker Compose, single PostgreSQL container with automated daily S3 backups, Traefik auto-SSL.

---

## 3. Core Business Logic & Architectural Pillars
1. **Inbound Intake & Agent Presence:**
   - Agent Active/Inactive presence toggle. Calls route to active agents.
   - Telnyx inbound webhook triggers screen pop with caller phone pre-filled.
   - Self-Booking vs Recipient toggle; Google Places geocoding; 16-Service Catalog; tax toggle (`$160 + tax or - tax(box)`); customer account auto-creation (`isUserAccountCreated`); 5 call dispositions.
2. **Landing Page Public Booking Subsystem:**
   - Public self-booking widget at `/` ingesting unverified leads (`isVerified = false`).
   - Call agents perform outbound verification calls/SMS before dispatching.
3. **Dispatch Logistics & B2B Fleets:**
   - Urgent queue count with expandable row accordion.
   - Interactive Arbitrary Address Distance Measurement Tool (measures driving distance from all active drivers to any typed address).
   - Single-click driver assignment.
   - Real-time two-way driver messaging per job ticket.
   - Driver Cash-in-Hand tracking panel.
   - B2B Fleets sidebar view (`Fleets`): ViciDial/BulkVS cold calling, contract signing verification, dedicated fleet service history, and **$2–$3 Virtual Assistant commission per completed job** (`FleetCommissionLedger`).
4. **Driver Mobile Execution (PWA):**
   - High-contrast sunlight UI with large step buttons (`EN_ROUTE`, `ARRIVED`, `IN_PROGRESS`, `COMPLETED`).
   - Gross & Net earnings display per job/shift.
   - Cash collection modal and in-app dispatch chat.
5. **Accountant Department & Job Expense Stating:**
   - **Active Job Costing:** The accountant is an active financial controller who **states the exact expenses for each job**:
     - **Repairer Fees** (`repairerFeeCents` / `driverPayoutCents`): Technician labor compensation.
     - **Material Fees** (`materialCostCents` / `tireMaterialCostCents`): Wholesale tires, rims, valves, patches, parts.
     - **Other Job Expenses** (`otherExpenseCents`): Incidental expenses with explanatory notes.
   - **Payment Verification:** Dedicated boolean flag `isPaymentVerified` with verifier identity and audit timestamp.
   - **Receipt Attachments via Multer:** Customer payment receipt (`receiptUrl`) and supplier material purchase slip (`materialReceiptUrl`).
   - **Dynamic Cost Formulas:**
     $$\text{Total Job Expense} = \text{Material Fees} + \text{Repairer Fees} + \text{Other Expenses}$$
     $$\text{Net Profit} = \text{Customer Paid (CP)} - \text{Total Job Expense}$$
     $$\text{Total Net After IT\_B} = \text{Net Profit} - \text{IT\_B}$$
   - **Platform IT Royalty (`IT_B`):** Fixed fee per job ($1.50 CAD / $1.00 USD / £1.00 GBP) with Total Net of IT_B.
   - **Date Presets:** 4 exact filters: `Yesterday`, `Last 3 Days`, `One Week`, `Monthly Amount`.
   - **Role Separation:** Junior Accountant inputs expenses and uploads receipts; Senior Accountant / Director audits, verifies payment, and approves repairer payout.
6. **Admin Portal ("Admin sees every thing"):**
   - Omni-channel executive oversight across Canada, USA, and UK.
7. **Frontend Architecture, Naming & State Rules:**
   - Strict `camelCase` for directories and functions.
   - `PascalCase` ONLY for page orchestrators in `src/pages/` (strict ceiling of 150 lines).
   - Dynamic Folder Mirroring: `src/pages/[PageName].tsx` $\rightarrow$ `src/components/pages/[pageName]/`.
   - Shared primitives in `src/components/ui/`.
   - **State Hierarchy:** Local first (`useState`/`useReducer`) $\rightarrow$ Lift up to closest common parent for siblings $\rightarrow$ Context / Zustand for deep nesting (4-5+ levels) to avoid prop drilling $\rightarrow$ Custom hooks for reusable logic (`useFetch`, `useJobDetails`).


---

## 4. Documentation Index (Fully Aligned in `context/`)
- `context/architecture.md`: Complete system architecture, subsystem topology, component diagrams, Express + TypeScript middleware stack.
- `context/prd.md`: Product Requirements Document covering FR-1 through FR-8 (including Telnyx screen pop, Fleets B2B, driver Gross/Net, accountant job expense stating & payment verification) and NFRs.
- `context/data_models.md`: Complete `schema.prisma` with `Fleet`, `FleetCommissionLedger`, `JobMessage`, `DriverCashLedger`, `JobFinancial` with expense stating and payment verification fields, and duplication audit table.
- `context/design.md`: Red & White design tokens, status badges, and wireframes for Agent Portal, Landing Page, Dispatch Board, Fleets view, Driver Mobile PWA, Accountant Expense Stating modal, and Admin Portal.
- `context/phases.md`: 5-phase implementation roadmap covering core foundation, agent intake, dispatch & fleets, driver execution, and accounting reconciliation.
- `context/rules.md`: Engineering rules, Ponytail/YAGNI principles, strict integer cents, zero duplication, Express + TypeScript middleware standards (Morgan, Helmet, CORS, Cookie-Parser, Bcrypt, Multer, Passport, Zod), and React conventions.
- `context/memory.md`: *This file* — updated every session to maintain state continuity.

---

## 5. Session Status & Next Steps
- **Current Milestone:** Complete System Design Synchronization & Specification Completed.
- **Backend Stack Transition:** Successfully migrated backend architecture from Fastify to **Express (Node.js + TypeScript)** with **Helmet, Morgan, CORS, Cookie-Parser, Passport-JWT, Bcrypt, Multer, and Zod**.
- **Active Deliverables:** All 7 core documentation files in `context/` are 100% verified, consistent, and adhere strictly to the updated system design diagram and user specifications.
- **Next Step:** Ready to initiate **Phase 1 Execution** (Express + TypeScript backend scaffolding, Prisma schema migration, seed catalog, and React Vite shell).
