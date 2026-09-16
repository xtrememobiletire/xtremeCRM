# System Architecture — XtremeCRM

## 1. Executive Summary
XtremeCRM is an operational CRM, dispatch, and fleet billing platform tailored for mobile tire repair, seasonal tire changeovers, and emergency roadside automotive services operating across three international regions: **Canada (CAD)**, **United States (USD)**, and the **United Kingdom (GBP)**.

The architecture is derived directly from the system design blueprint ([`Xtreme-System-Design.svg`](file:///mnt/mydrive/Projects/xtremeCRM/context/Xtreme-System-Design.svg) and [`Xtreme-System-Design.png`](file:///mnt/mydrive/Projects/xtremeCRM/context/Xtreme-System-Design.png)). It emphasizes **high operational velocity, minimal latency, zero redundant data**, and strict architectural separation between **Internal Company Staff** (operating inside `/admin`) and **External Customer Accounts** (operating in sandboxed self-service portals `/fleet-dashboard` and `/member-dashboard`).

---

## 2. Technology Stack & Component Topology

```text
+----------------------------------------------------------------------------------------------------+
|                                    FRONTEND CLIENTS (React 19 + Vite SPA)                          |
|                                                                                                    |
|  [ Internal Admin Portal ]     [ External Fleet Portal ]     [ External Member Portal ]             |
|  - URL: /admin                 - URL: /fleet-dashboard      - URL: /member-dashboard              |
|  - Admin God-Mode Oversight    - 18+ Vehicles & Plates       - Personal Vehicle Profiles            |
|  - Telnyx WebRTC Softphone     - My Drivers Directory        - Priority Roadside Dispatch           |
|  - Dual-Trigger Screen Pop      - Service Request Form        - Member Pricing & Receipts            |
|  - Proximity Distance Tool     - Live Service Status         - Service History                      |
|  - 1-Click Invoice Generator   - Pending & Paid Invoices                                            |
|  - Active Accountant Costing   - Internal Portal Inbox                                              |
|  - IT_B Royalty Ledger                                                                              |
|                                                                                                    |
|  +-----------------------+   +--------------------------+   +----------------------------------+   |
|  |   Zustand Store       |   |   TanStack Query v5      |   |   Telnyx WebRTC + Socket.io      |   |
|  |   (Client & UI State) |   |   (Server State & Cache) |   |   (Softphone Audio & Push Evts)  |   |
|  +-----------------------+   +-------------+------------+   +-----------------+----------------+   |
+--------------------------------------------|----------------------------------|--------------------+
                                             | REST API (JSON)                  | WebRTC / WebSockets
                                             v                                  v
+----------------------------------------------------------------------------------------------------+
|                                   BACKEND API (Express + TypeScript 5.9.x)                         |
|                                                                                                    |
|  +----------------------------------------------------------------------------------------------+  |
|  | Express Middleware Pipeline: Helmet, Morgan, CORS, Cookie-Parser, Rate-Limiting              |  |
|  +-----------------------------------------------+----------------------------------------------+  |
|                         |                        |                                                 |
|                         v                        v                                                 v
|  +-------------------------------+  +-----------------------------+  +--------------------------+  |
|  | Security & Ingestion Layer    |  | Socket.io & Telephony Engine|  | Prisma ORM v7 Client     |  |
|  | - Passport-JWT & Bcrypt       |  | - Rooms: dispatch:{region}  |  | - @prisma/adapter-pg     |  |
|  | - Zod Request Validation      |  | - Rooms: driver:{driverId}  |  | - prisma.config.ts       |  |
|  | - Multer File/Receipt Upload  |  | - Rooms: chat:job:{jobId}   |  | - Multi-Tenant DB Pool   |  |
|  | - Telnyx Inbound Webhook      |  | - Telnyx On-Demand Token Svc|  | - Tenant Scoping Ext     |  |
|  +-------------------------------+  +-----------------------------+  +-------------+------------+  |
+------------------------------------------------------------------------------------|---------------+
                                                                                     |
                                                                                     v
+----------------------------------------------------------------------------------------------------+
|                                   PERSISTENCE & INFRASTRUCTURE                                     |
|                                                                                                    |
|  +----------------------------------------------------------------------------------------------+  |
|  | PostgreSQL Database                                                                          |  |
|  | - Local Development: Cloud Neon DB with PgBouncer Connection Pooler (ep-*-pooler...)          |  |
|  | - Production: Single PostgreSQL Container Managed via Dokploy on Hostinger 16GB KVM VPS      |  |
|  | - Indexed countryCode Tenant Scoping ('CA', 'US', 'UK')                                      |  |
|  | - ACID Ledger for Job Expenses (TC, DC), Invoices, and IT_B Royalties                        |  |
|  +----------------------------------------------------------------------------------------------+  |
+----------------------------------------------------------------------------------------------------+
```

### Chosen Stack & Rationales

| Layer | Technology | Why Chosen & Operational Role |
| :--- | :--- | :--- |
| **Frontend Framework** | **React 19 + Vite** | Instant HMR, sub-second cold starts, broad ecosystem, high UI velocity. |
| **Client State** | **Zustand** | Zero boilerplate (unlike Redux), tiny bundle footprint (< 3KB), ideal for modal state, active country, agent active/inactive state, and active filters. |
| **Server State / Cache** | **TanStack Query v5** | Automatic cache invalidation, deduplicated requests, background refetching, optimistic updates for dispatch. |
| **Styling & Motion** | **Tailwind CSS v4 + Framer Motion** | Fast compile-time purge, predictable Red & White tokens, polished micro-interactions. |
| **Form Engine** | **React Hook Form + Zod** | Zero-lag uncontrolled form inputs optimized for high-speed manual call agent keyboard data entry. Shared Zod validation with backend. |
| **Real-time Comms** | **Socket.io** | Real-time bidirectional communication with dedicated rooms (`dispatch:{region}`, `driver:{driverId}`, `chat:job:{jobId}`). Auto-reconnects on mobile drops. |
| **Telephony** | **Telnyx WebRTC (`@telnyx/webrtc`) & Webhooks** | Embedded in-browser softphone. Agents answer calls directly through USB headset; 1-click click-to-call. Triggers dual screen pop with caller ID pre-filled. |
| **Backend Framework** | **Express (Node.js + TypeScript 5.9.x)** | Industry-standard, proven stability, massive ecosystem, transparent middleware pipeline. |
| **Backend Validation** | **Zod** | Type-safe schema validation for all request bodies, query params, and route parameters with automatic TypeScript type inference. |
| **ORM** | **Prisma ORM v7** | End-to-end TypeScript type safety, declarative migrations, `@prisma/adapter-pg` driver adapter, and `prisma.config.ts`. |
| **Database** | **PostgreSQL (Neon in Dev / Dokploy in Prod)** | Relational integrity, ACID compliance, zero inventory bloat, integer cents storage (`*_cents`). |

---

## 3. Core Subsystems

### 3.1. Internal Admin Portal (`/admin`)
- **Admin God-Mode:** The Admin has complete, unrestricted control over the entire system on one screen (answering calls, dispatching vans, editing invoices, changing prices, viewing net margins) without internal permission barriers.
- **Embedded Telnyx WebRTC Softphone & Dual-Trigger Screen Pop:**
  - **In-Browser Audio:** Connected via `@telnyx/webrtc` using short-lived tokens from `GET /api/telephony/token`. Agents converse directly through their browser headset with call controls (Answer, Mute, Hold, Hang Up).
  - **Dual-Trigger Screen Pop:** Incoming calls trigger the intake modal via WebRTC client events and server webhook (`POST /api/telephony/webhook` broadcasting to `dispatch:{region}` over Socket.io).
  - **Data Division (Auto vs. Agent-Entered):**
    - *Auto-Populated on Ring:* Caller phone number, lead source (`DIRECT_CALL`), unique call ID, call timestamp, and matching returning customer profile / registered fleet vehicles.
    - *Agent-Entered During Conversation:* Roadside breakdown location (geocoded via Google Places), on-scene recipient info, vehicle & tire confirmation, service selection (16-service catalog), verbal agreed ETA, price quote & tax toggle, problem notes, and mandatory call disposition (`Booked`, `RNC`, `WN`, `IR`, `Cancelled`).
- **Interactive Proximity & Distance Tool:**
  - Typing any address measures real driving distance and ETA from all active technicians.
- **Appointments Board:** Urgent vs Standard vs Future queues with expandable row accordions.

### 3.2. 24/7 Fleet Driver Roadside Verification Workflow
- Truck and van drivers call 24/7 dispatch directly from the road.
- Dispatcher types the **License Plate Number** (e.g. `KT-15`) or **Company Name** (e.g. "KT Group").
- CRM immediately pops up:
  1. Active fleet agreement (`Approved` badge, account code `XMT-5132`).
  2. Registered vehicle make/model and **exact pre-saved tire size** (`11R22.5`).
  3. Authorized billing terms.
- Technician is dispatched immediately with the correct tire without waiting for fleet manager authorization.

### 3.3. External Fleet Manager Portal (`/fleet-dashboard`)
- **Sandboxed B2B Client Environment:** Fleet Managers log into their dedicated dashboard with 7 primary sections:
  1. **Dashboard:** Fleet KPIs (18 Vehicles, Drivers, Company profile with internal email `piratheep@xtrememobiletire.com`).
  2. **Vehicles Directory:** Card grid of all registered fleet trucks/vans with License Plate (`KT-15`), Model, and Year.
  3. **My Drivers:** Driver names and mobile numbers.
  4. **Request New Service:** 24/7 appointment & roadside request form.
  5. **Service Status:** Live tracking table with Appt #, Service, Type, Vehicle, Tire Size, Address, Date/Time, and Status.
  6. **Pending Invoices:** Open unpaid invoices.
  7. **Paid Invoices:** Settled invoices with PDF receipts.
- **Internal Portal Inbox (`PortalMessage`):** Fleets receive company notices, work orders, and invoice links directly inside their portal inbox, eliminating reliance on third-party email platforms.

### 3.4. Commercial Invoicing Engine
- **Separation of Invoices from Jobs:**
  - `Job`: Tracks operational fulfillment (status: `PENDING` $\rightarrow$ `EN_ROUTE` $\rightarrow$ `ARRIVED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `COMPLETED`).
  - `Invoice`: Commercial instrument (`INV-0002`) with issue date, due date, line items, and payment instructions.
- **Custom Creator Numbering:**
  - Format: **`[CreatorInitials]-[CountryCode]-[SequentialDigits]`** (e.g. `MW-US-0002`, `AG-CA-0105`).
- **Flexible Due Dates:** User-selectable due date (Due on Receipt, Net 15, Net 30).
- **1-Click Generation & Multi-Job Weekly Fleet Consolidation:**
  - 1-click generation from completed jobs for single retail/member tickets.
  - Multi-job consolidation bundling weekly roadside calls for corporate fleets into a single itemized invoice.
- **Professional PDF Generator:**
  - Replicates verified layout with Red & Black branding, customer details, regional warehouse address, line items table, and bank transfer terms (`Payments@xtrememobiletire.com`).

### 3.5. Accountant Department & Active Job Costing (Zero Inventory)
- **Zero Stock Tracking Overhead:** No warehouse stock counts or inventory ledgers. Wholesale tires and parts are purchased on-demand as direct expenses per ticket.
- **Active Job Costing:**
  - Accountant enters **Material Cost ($TC$)** and **Repairer Labor Fee ($DC$)** for each completed job ticket.
  - Payment verified with dynamic verification state (`paymentVerifiedById != null || paymentStatus == VERIFIED_PAID`) and receipt attachments via Multer.
- **Derived Financial Metrics on Read:**
  $$\text{Net Profit} = \text{Customer Paid (CP)} - TC - DC$$
  $$\text{Net After IT\_B} = \text{Net Profit} - \text{IT\_B}$$
- **Platform IT Royalty (`IT_B`):**
  - Canada: **$1.50 CAD** | USA: **$1.00 USD** | UK: **£1.00 GBP**.

### 3.6. Regional Territorial Hubs
- **US Regional Hub:** 11815 Medway Church Loop, Manassas, VA 20109 | (804) 326-5442 (USD).
- **Canada Regional Hub:** 857 Winterton Way, Mississauga, ON L5V 1Z5 | (437) 375-5674 (CAD).

---

## 4. Production Deployment & Scalability Architecture

### 4.1. Development Environment (Neon DB)
- `DATABASE_URL` connects through Neon's cloud PgBouncer pooler (`ep-*-pooler...`) to support pooled concurrent API traffic.
- `DIRECT_URL` connects directly to PostgreSQL for Prisma DDL migrations and schema pushes.
- Configuration loaded dynamically via `backend/prisma.config.ts`.

### 4.2. Production Deployment (Dokploy on VPS)
- Hosted on a 16GB KVM VPS managed via **Dokploy**:
  1. Single PostgreSQL container with native connection pooling (~100-200 concurrent connections).
  2. Express Backend container with internal `pg.Pool` managing database connections.
  3. React Frontend container served via Vite / Nginx.
  4. Traefik auto-SSL reverse proxy.
- **Zero External PgBouncer Needed in Production:** The VPS native PostgreSQL + backend `pg.Pool` handles all production load reliably without external pooling containers.
