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
  - Centralized error handling middleware- **Database & ORM:** **PostgreSQL** with **Prisma ORM v7** + `@prisma/adapter-pg` driver adapter and `prisma.config.ts`:
  - **Local Development:** Cloud **Neon DB** with PgBouncer connection pooler (`ep-*-pooler...`) for `DATABASE_URL` and unpooled direct host for `DIRECT_URL`.
  - **Production:** Self-hosted single PostgreSQL container managed via **Dokploy** on VPS.
  - Multi-tenancy scoped by indexed `countryCode` (`CA`, `US`, `UK`).
- **Real-Time Communication:** **Socket.io** — Bidirectional updates for dispatch queue, live technician tracking, and chat.
- **Telephony Integration:** **Telnyx WebRTC & Webhooks** — Screen pop with caller number pre-filled.
- **Frontend SPA:** **React 19 + Vite** + **Tailwind CSS v4** (`@tailwindcss/vite`), Red & White theme (`#DC2626` & `#FFFFFF`).
- **Client State:** **Zustand** for UI controls; **TanStack Query v5** for server cache; **Framer Motion** for polished interactions.

---

## 3. Core Business Logic & Architectural Pillars
1. **Three Distinct Portals**:
   - `/admin` $\rightarrow$ **Internal Staff (Admin God-Mode)**: Full unrestricted control over call intake, dispatching, accounting reconciliation, driver tracking, and invoice management.
   - `/fleet-dashboard` $\rightarrow$ **External Fleet Clients (B2B)**: Sandboxed portal with fleet code (`XMT-5132`), assigned company email (`piratheep@xtrememobiletire.com`), 18+ vehicle registry with license plates (`KT-15`, `KT-18`), driver directory, service bookings, internal portal inbox, and pending/paid invoices.
   - `/member-dashboard` $\rightarrow$ **External Personal Members (B2C)**: Personal vehicle profiles, priority roadside bookings, exclusive member pricing, and receipts.
2. **24/7 Roadside Driver Lookup**:
   - On-the-road truck drivers call 24/7 dispatch directly quoting Company Name or License Plate.
   - Dispatcher instantly verifies active fleet agreement and pre-registered tire size (`11R22.5`, `235/65R17`), dispatching the technician without phone tag.
3. **Invoicing & Financial Engine**:
   - **Separate from Jobs**: Jobs are operational fulfillment; Invoices are commercial instruments (`INV-0002` layout).
   - **Custom Numbering**: `[Initials]-[Country]-[digits]` (e.g. `MW-US-0002` for Mike William, `AG-CA-0105` for Agent).
   - **Flexible Due Dates**: User-selectable due date (default Net-15/30 or custom).
   - **Multi-Job Fleet Invoicing**: 1-click invoice generation from completed jobs, bundling multiple weekly dispatches into one consolidated bill.
   - **Automated PDF Export**: Server/client PDF generator replicating the verified KT Group invoice template with company banking instructions (`Payments@xtrememobiletire.com`).
4. **Active Job Costing (Zero Inventory)**:
   - No warehouse inventory or stock counts.
   - Accountants directly input actual job expenses:
     - **Material Cost ($TC$)**: Wholesale tire/parts cost.
     - **Technician Fee ($DC$)**: Mobile repairer labor.
     - **Platform Royalty ($IT\_B$)**: $1.50 CAD / $1.00 USD / £1.00 GBP.
   - **Derived Net Profit on Read**:
     $$\text{Net Profit} = \text{Customer Paid (CP)} - TC - DC$$
     $$\text{Net After IT\_B} = \text{Net Profit} - IT\_B$$
5. **Regional Hubs (Addresses & Currency Separation)**:
   - **US Regional Hub**: 11815 Medway Church Loop, Manassas, VA 20109 (covering VA, MD, DC, KY, NC, TN in USD).
   - **Canada Regional Hub**: 857 Winterton Way, Mississauga, ON L5V 1Z5 (covering ON & GTA in CAD).
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
- `context/design.md`: Industrial Utilitarian & Tactical Emergency Roadside Console design system built with the `frontend-design` skill; OKLCH tokens, fluid clamp typography, tabular telemetry, native dialogs, and comprehensive wireframes across Internal Staff (/admin), B2B Fleet Portal (/fleet-dashboard), Invoicing Engine, and Member Portal.
- `context/phases.md`: 5-phase implementation roadmap covering core foundation, agent intake, dispatch & fleets, driver execution, and accounting reconciliation.
- `context/rules.md`: Engineering rules, Ponytail/YAGNI principles, strict integer cents, zero duplication, Express + TypeScript middleware standards (Morgan, Helmet, CORS, Cookie-Parser, Bcrypt, Multer, Passport, Zod), and React conventions.
- `context/memory.md`: *This file* — updated every session to maintain state continuity.

---

## 5. Session Status & Next Steps
- **Current Milestone:** System Design & Specification Fully Synchronized; Design System Upgraded with `frontend-design` Skill.
- **Prisma 7 Fix:** Resolved `directUrl` deprecation error in `backend/prisma.config.ts` by pointing `datasource.url` to `env("DIRECT_URL") || env("DATABASE_URL")` per Prisma 7 standards.
- **Backend Stack:** Express (Node.js + TypeScript) with Helmet, Morgan, CORS, Cookie-Parser, Passport-JWT, Bcrypt, Multer, and Zod.
- **Active Deliverables:** All 7 core documentation files in `context/` are 100% verified, consistent, and adhere strictly to the system design diagram, user specifications, and anti-AI-slop design principles.
- **Next Step:** Ready to initiate **Phase 1 Execution** (Express + TypeScript backend scaffolding, Prisma schema migration, seed catalog, and React Vite shell).
