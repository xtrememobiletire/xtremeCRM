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
- **Telephony Integration:** **Telnyx WebRTC (`@telnyx/webrtc`) & Webhooks** — Embedded in-browser softphone with backend on-demand token service (`GET /api/telephony/token`), dual-trigger screen pop (WebRTC client + server webhook over Socket.io), and 1-click click-to-call.
- **Frontend SPA:** **React 19 + Vite** + **Tailwind CSS v4** (`@tailwindcss/vite`), Red & White theme (`#DC2626` & `#FFFFFF`).
- **Client State:** **Zustand** for UI controls; **TanStack Query v5** for server cache; **Framer Motion** for polished interactions.

---

## 3. Core Business Logic & Architectural Pillars
1. **Three Distinct Portals**:
   - `/admin` $\rightarrow$ **Internal Staff (Admin God-Mode)**: Full unrestricted control over call intake, dispatching, accounting reconciliation, driver tracking, and invoice management.
   - `/fleet-dashboard` $\rightarrow$ **External Fleet Clients (B2B)**: Sandboxed portal with fleet code (`XMT-5132`), billing/contact email (`Fleet.email`), 18+ vehicle registry with license plates (`KT-15`, `KT-18`), driver directory, service bookings, internal portal inbox, and pending/paid invoices.
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
5. **Strict Regional Hubs & Absolute Country Isolation (Zero Blended Revenue)**:
   - **US Regional Hub**: 11815 Medway Church Loop, Manassas, VA 20109 (covering VA, MD, DC, KY, NC, TN in USD).
   - **Canada Regional Hub**: 857 Winterton Way, Mississauga, ON L5V 1Z5 (covering ON & GTA in CAD).
   - **UK Operations**: Independent hub covering UK operations in GBP (£).
   - **Zero Cross-Currency Blending**: No mixed totals or currency conversions. US, Canada, and UK are independent silos with separate pricing, separate taxes, and separate P&L reports.
   - **Money in Integer Cents**: All monetary values are stored in whole cents/pence (`*_cents`) to prevent floating-point rounding bugs (`0.1 + 0.2 != 0.3`). The UI always renders human-readable `$160.00` or `£45.50`.
   - **Platform IT Royalty (`IT_B`):** Fixed fee per job (150 cents [$1.50 CAD] / 100 cents [$1.00 USD] / 100 pence [£1.00 GBP]).
   - **Date Presets:** 4 exact filters: `Yesterday`, `Last 3 Days`, `One Week`, `Monthly Amount`.
   - **Accountant Role:** Single unified `ACCOUNTANT` role inputs job expenses, attaches receipts via Multer, verifies payment, audits tickets, and approves repairer payouts.
6. **Admin Portal ("Admin sees every thing"):**
   - Omni-channel executive oversight across Canada, USA, and UK, viewing each country's metrics in separate, side-by-side regional cards without blending revenues.
7. **Frontend Architecture, Naming & State Rules:**
   - Strict `camelCase` for directories and functions.
   - `PascalCase` ONLY for page orchestrators in `src/pages/` (strict ceiling of 150 lines).
   - Dynamic Folder Mirroring: `src/pages/[PageName].tsx` $\rightarrow$ `src/components/pages/[pageName]/`.
   - Shared primitives in `src/components/ui/`.
   - **State Hierarchy:** Local first (`useState`/`useReducer`) $\rightarrow$ Lift up to closest common parent for siblings $\rightarrow$ Context / Zustand for deep nesting (4-5+ levels) to avoid prop drilling $\rightarrow$ Custom hooks for reusable logic (`useFetch`, `useJobDetails`).
8. **Call Intake Data Division & Non-User Handling:**
   - **Auto-Populated on Ring:** Caller phone number (`phone`), default lead source (`DIRECT_CALL`), call ID, timestamp, area-code geographic detection, and returning customer/fleet match check.
   - **First-Time Callers / Non-Users:** Screen displays `[✦ NEW CALLER / NON-USER]` badge with pre-filled phone number, 1-click `[ Link to Fleet ]` option, clean blank intake form, and pre-checked `[x] Auto-Create Customer Account & Send SMS Live Tracking Link` (converting them into registered users upon booking confirmation).
   - **Agent-Entered Live During Call:** Exact roadside breakdown location (geocoded via Google Places), on-scene recipient info, vehicle & tire size confirmation, 16-service selection, verbal agreed ETA, quote & sales tax toggle, problem notes, and mandatory call disposition (`Booked`, `RNC`, `WN`, `IR`, `Cancelled`).


---

## 4. Documentation Index (Fully Aligned in `context/`)
- `context/architecture.md`: Complete system architecture, subsystem topology, component diagrams, Express + TypeScript middleware stack.
- `context/prd.md`: Product Requirements Document covering FR-1 through FR-8 (including Telnyx screen pop, Fleets B2B, driver Gross/Net, accountant job expense stating & payment verification) and NFRs.
- `context/data_models.md`: Reconciled complete Prisma schema with zero duplicate state, restoring DriverCashLedger, JobServiceItem, FleetCommissionLedger, PortalMessage, JobMessage, and comprehensive duplication audit table.
- `context/design.md`: Industrial Utilitarian & Tactical Emergency Roadside Console design system built with the `frontend-design` skill; OKLCH tokens, fluid clamp typography, tabular telemetry, native dialogs, and comprehensive wireframes across Internal Staff (/admin), B2B Fleet Portal (/fleet-dashboard), Invoicing Engine, and Member Portal.
- `context/phases.md`: 5-phase implementation roadmap covering core foundation, agent intake, dispatch & fleets, driver execution, and accounting reconciliation.
- `context/rules.md`: Engineering rules, Ponytail/YAGNI principles, strict integer cents, zero duplication, Express + TypeScript middleware standards (Morgan, Helmet, CORS, Cookie-Parser, Bcrypt, Multer, Passport, Zod), and React conventions.
- `context/memory.md`: *This file* — updated every session to maintain state continuity.

---

## 5. Session Status & Next Steps
- **Current Milestone:** Backend REST API, Controllers, Swagger UI, Positive/Negative Test Suites, and Complete Design System / PRD Synchronization 100% Complete.
- **Backend Deliverables (Verified & Rock Solid):**
  - All 11 controllers implemented and standardized on `backend/src/utils`.
  - Swagger UI live console at `GET /api/docs` with OpenAPI 3.0 specification at `GET /api/docs/openapi.json`.
  - Helmet Content Security Policy (CSP) resolved (`unsafe-eval`, `unsafe-inline`, `cdn.jsdelivr.net`) preventing white screen.
  - Root URL `GET /` automatically redirects (`302`) to `/api/docs`.
  - Positive API suite: 33/33 passed (`tests/curl-all-endpoints.sh`).
  - Negative API suite: 20/20 passed (`tests/curl-negative-tests.sh`).
  - `pnpm lint` and `pnpm build` pass with 0 errors.
- **Design System & PRD Deliverables:**
  - `context/design.md` fully enriched with:
    - Section 2: OKLCH dual-theme color system (Daylight Console & Tactical Obsidian), zero-flicker `<head>` switching script, Zustand store, and segmented pill UI switcher.
    - Section 6: Added wireframes 6.9 (Lead Triage), 6.10 (Accountant Console), 6.11 (Driver Financial Sandbox).
    - Section 8: 13 comprehensive edge case subsections (Error/Empty states, Form Validation, Token scales, Driver PWA, Real-time, Tables, Audio/Notifs, A11y, Print/PDF, Performance, Jr vs Sr Accountant capability architecture, Lead Triage State Machine, and Driver Cash Envelope protocol).
  - `context/prd.md` synchronized with Jr vs Sr Accountant capability boundaries (`canApprovePayouts`), 4 date filter presets, landing page lead triage pipeline, and reinforced NFR-4 driver financial sandboxing.
