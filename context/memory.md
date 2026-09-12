# Project Memory & Session State — XtremeCRM

## 1. Project Overview
- **Project Name:** XtremeCRM
- **Domain:** Mobile Tire Repair, Seasonal Tire Swapping, and Emergency Roadside Assistance CRM & Dispatching.
- **Regions:** Canada (CAD), United States (USD), United Kingdom (GBP).
- **Core Theme:** High-contrast Red & White (`#DC2626` & `#FFFFFF`), clean, fast, professional automotive emergency look.

---

## 2. Confirmed Technology Stack
- **Backend API:** **Fastify** (Node.js) — 2x-3x faster than Express. Equipped with Fastify Velocity Suite:
  - `@fastify/autoload`: Zero-boilerplate automatic route & plugin directory loading.
  - `@sinclair/typebox`: Unified single-source runtime validation + TypeScript types.
  - `@fastify/swagger` + `@fastify/swagger-ui`: Automatic OpenAPI documentation at `/docs`.
  - `@fastify/jwt` & `@fastify/cookie`: High-speed token auth in HttpOnly cookies.
  - `@fastify/sensible` & `@fastify/cors`: Standardized error handling and CORS.
- **Database & ORM:** **PostgreSQL 16** with **Prisma ORM** — Single database in Dokploy with indexed `countryCode` tenant scoping via Prisma Client Extensions (`prisma.$extends`).
- **Real-Time Communication:** **Socket.io** — Dedicated rooms for regions (`dispatch:CA`), jobs (`job:id`), and mobile drivers (`driver:id`).
- **Frontend SPA:** **React 18 + Vite** + **Tailwind CSS** (Red & White automotive emergency theme).
- **Client UI State:** **Zustand** — Ephemeral UI controls (drawers, modals, filters, dialer state).
- **Server State / Cache:** **TanStack Query v5** — Automatic cache invalidation upon socket events.
- **Form Engine:** **React Hook Form + Zod** — Zero-lag keyboard booking for call agents.
- **Telephony & Dialer:** **Zadarma Cloud PBX** — $0/seat cloud contact center, US/CA/UK DIDs, inbound ring groups, and webhook screen-pop (`POST /api/telephony/zadarma-webhook`) without raw WebRTC engineering.
- **Hosting & DevOps:** **Dokploy** on Hostinger 16GB KVM VPS — Docker Compose, 1-click PostgreSQL with automated daily backups, Traefik auto-SSL.

---

## 3. Core Business & Architectural Rules
1. **Zero Field Duplication:**
   - Vehicle holds `tireSize` and `year/make/model`. `Job` references `vehicleId` (no duplicate columns).
   - Customer holds primary/alt phone and contact info. `Job` references `customerId`.
   - Roadside breakdown address is stored strictly on `Job.serviceAddress`.
   - Dynamic P&L calculation: $\text{Net Margin} = \text{total\_cents} - \text{tire\_material\_cost\_cents} - \text{driver\_payout\_cents}$ (derived, never stored redundantly).
2. **Strict Money Handling & Currency Bucketing:**
   - Stored in integer **cents** (`*_cents`) with an explicit currency code (`CAD`, `USD`, `GBP`). Never floating point.
   - Currency Bucketing: Never blend different currencies into one sum when "All Regions" is active. Display distinct side-by-side metric cards powered by `groupBy: ['currency']`.
3. **Platform IT Fee (`IT_B`):**
   - Fixed per-job royalty: **$1.50 CAD**, **$1.00 USD**, **£1.00 GBP**.
4. **Cash Reconciliation:**
   - Dedicated `driver_cash_ledgers` tracks cash in hand to prevent driver-dispatcher discrepancies.
5. **Dokploy & Clean Multi-Tenancy Architecture:**
   - Single PostgreSQL database managed inside Dokploy with 1-click automated backups.
   - Zero model duplication (strictly 1 model per entity: `User`, `Job`, `Customer`).
   - Tenant scoping powered by an indexed `countryCode` column and Fastify Prisma Client Extensions (`prisma.$extends`).
   - Director role has unrestricted global access for cross-country aggregation in 1 fast query.
   - Ultra-low RAM footprint (< 400MB total) leaving 15GB+ RAM free on the Hostinger VPS.

---

## 4. Documentation Index (Created in `context/`)
- `context/architecture.md`: High-level system architecture, subsystem breakdown, and component diagrams.
- `context/rules.md`: Engineering guidelines, Ponytail/YAGNI principles, DB normalization rules, and Fastify/React conventions.
- `context/design.md`: Red & White color palette tokens, typography, and wireframe layouts for the 4 core views.
- `context/data_models.md`: Complete `schema.prisma` definitions, relation mappings, and duplication audit table.
- `context/prd.md`: Product Requirements Document covering all functional (FR) and non-functional (NFR) specs.
- `context/phases.md`: 6-phase implementation roadmap from core foundation to Talk Nexus in-house dialer.
- `context/memory.md`: *This file* — updated every session to maintain state continuity.

---

## 5. Session Status & Next Steps
- **Current Milestone:** Planning & Architectural Specification Completed.
- **Active Deliverables:** All 7 core documents established in `context/`.
- **Diagrams:** Converted from Mermaid to universal Unicode text box diagrams so they render natively in Antigravity IDE and any editor without extensions.
- **Next Step:** Review specification with the user and initiate **Phase 1 Execution** (Monorepo scaffolding with Fastify, Prisma schema initialization, and React Vite shell).
