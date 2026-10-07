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
|  [ Internal Operations Console ]   [ External Fleet Portal ]     [ External Member Portal ]        |
|  - URL: /admin                     - URL: /fleet-dashboard      - URL: /member-dashboard         |
|  - Standard Jobs: /jobs            - 18+ Vehicles & Plates       - Personal Vehicle Profiles       |
|  - Fleet Accounts: /fleet-jobs     - My Drivers Directory        - Priority Roadside Dispatch      |
|  - Web Ingress: /bookings          - Service Request Form        - Member Pricing & Receipts       |
|  - Outbound Queue: /outbound       - Live Service Status         - Service History                 |
|  - Lead Ingestion: /va-upload      - Pending & Paid Invoices                                       |
|  - Mapbox Single-View Dispatch     - Internal Portal Inbox                                         |
|  - 1-Click Invoice Generator                                                                       |
|                                                                                                    |
|  +-----------------------+   +--------------------------+   +----------------------------------+   |
|  |   Zustand Store       |   |   TanStack Query v5      |   |   Native EventSource (SSE)       |   |
|  |   (UI & Modal State)  |   |   (In-Memory Cache Only) |   |   (Server-Sent Event Stream)     |   |
|  +-----------------------+   +-------------+------------+   +-----------------+----------------+   |
+--------------------------------------------|----------------------------------|--------------------+
                                             | REST API (JSON)                  | HTTP Stream (SSE)
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
|  | Security & Ingestion Layer    |  | SSE Real-Time Engine        |  | Mapbox Proximity Service |  |
|  | - Passport-JWT & Bcrypt       |  | - Endpoint: /api/events/stream | - Geocoding & Search API |  |
|  | - Zod Request Validation      |  | - Channel: sse:dispatch:{cc}|  | - Matrix Travel Duration |  |
|  | - Multer File/Receipt Upload  |  | - Channel: sse:driver:{id}  |  | - Directions w/ Traffic  |  |
|  | - Web Booking Ingress Route   |  | - Keepalive Heartbeat (20s) |  | - Single-View Dispatch   |  |
|  | - External Dialer Webhooks    |  | - Last-Event-ID Resumption  |  |   Snapshot Engine        |  |
|  +-------------------------------+  +-----------------------------+  +-------------+------------+  |
+------------------------------------------------------------------------------------|---------------+
                                                                                     | Prisma ORM v7
                                                                                     v
+----------------------------------------------------------------------------------------------------+
|                                   PERSISTENCE & INFRASTRUCTURE                                     |
|                                                                                                    |
|  +----------------------------------------------------------------------------------------------+  |
|  | PostgreSQL Database (Single Container on Dokploy VPS / Neon DB in Dev)                       |  |
|  | - Indexed Multi-Tenancy by CountryCode ('CA', 'US', 'UK')                                    |  |
|  | - In-Memory Event Client Registry (Zero Redis Dependency for SSE Single Instance)            |  |
|  | - ACID Ledgers for Financials, Invoices, Driver Cash, and Fleet Commissions                  |  |
|  +----------------------------------------------------------------------------------------------+  |
+----------------------------------------------------------------------------------------------------+
```

### Chosen Stack & Rationales

| Layer | Technology | Why Chosen & Operational Role |
| :--- | :--- | :--- |
| **Frontend Framework** | **React 19 + Vite** | Instant HMR, sub-second cold starts, broad ecosystem, high UI velocity. |
| **Client State** | **Zustand** | Zero boilerplate (unlike Redux), tiny bundle footprint (< 3KB), ideal for modal state, active country, and active filters. |
| **Server State / Cache** | **TanStack Query v5** | **Strict In-Memory Storage Only:** TanStack Query caches server data in RAM with SSE-driven invalidation. Storing query cache in `sessionStorage` or `localStorage` is strictly forbidden. |
| **Styling & Motion** | **Tailwind CSS v4 + Framer Motion** | Fast compile-time purge, predictable Red & White tokens, polished micro-interactions. |
| **Form Engine** | **React Hook Form + Zod** | Zero-lag uncontrolled form inputs optimized for high-speed manual call agent keyboard data entry. Shared Zod validation with backend. |
| **Real-time Comms** | **Server-Sent Events (SSE)** | Unidirectional, lightweight event stream over HTTP/1.1 or HTTP/2. Automatically handled by browser `EventSource` with native reconnection. Zero WebSocket protocol overhead; fully compatible with Dokploy Traefik proxy. |
| **Telephony** | **External Partner Delegation with Telnyx Code Preservation** | Active voice routing and dialing run on the partner platform. The existing Telnyx WebRTC softphone and backend token/call-control engine are **fully preserved and retained** in the codebase under a dormant feature flag (`ENABLE_TELNYX_SOFTPHONE=false`) for future direct integration. |
| **Proximity & Routing** | **Mapbox Platform Services** | Mapbox Geocoding for address coordinate resolution; Mapbox Matrix API for multi-driver travel distance/duration; Directions API with live traffic layers for single-view dispatch calculation. Replaces Google Distance Matrix without battery-draining continuous GPS tracking loops. |
| **Backend Framework** | **Express (Node.js + TypeScript 5.9.x)** | Industry-standard, proven stability, massive ecosystem, transparent middleware pipeline. |
| **Backend Validation** | **Zod** | Type-safe schema validation for all request bodies, query params, and route parameters with automatic TypeScript type inference. |
| **ORM** | **Prisma ORM v7** | End-to-end TypeScript type safety, declarative migrations, `@prisma/adapter-pg` driver adapter, and `prisma.config.ts`. |
| **Database** | **PostgreSQL (Neon in Dev / Dokploy in Prod)** | Relational integrity, ACID compliance, zero inventory bloat, integer cents storage (`*_cents`). |

---

## 3. Core Subsystems

### 3.1. Internal Operations Console (`/admin`)
- **Admin God-Mode:** The Admin has complete, unrestricted oversight over the entire system across Canada, USA, and UK without internal permission blocks.
- **External Dialer Delegation & High-Speed Intake (Telnyx Code Preserved):**
  - Live voice communications and automated dialer queues operate on the partner dialer platform.
  - Native Telnyx softphone components and services (`@telnyx/webrtc`, `telnyxService.ts`, `telephonyController.ts`) are **fully preserved and retained** in the codebase for future direct Telnyx softphone re-activation.
  - Inbound caller ID pre-fills CRM intake via URL/webhook integration hooks.
  - Returning customer/fleet auto-detection enables rapid 1-click vehicle selection.
  - Breakdown addresses geocoded and validated via Mapbox address autocomplete.
- **Mapbox Proximity Dispatch & Tri-Route Triage:**
  - Specialized route partitioning across `/jobs` (retail), `/fleet-jobs` (commercial SLAs), and `/bookings` (web triage).
  - Single-view on-demand Mapbox Matrix API calculation evaluates candidate driver travel times and traffic snapshots at assignment time (no continuous background GPS tracking).
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

### 3.7. Server-Sent Events (SSE) Architecture & Streaming Protocol

#### 3.7.1. Backend SSE Streaming Architecture
- **Endpoint:** `GET /api/events/stream`
- **Headers:**
  ```http
  Content-Type: text/event-stream
  Cache-Control: no-cache, no-transform
  Connection: keep-alive
  X-Accel-Buffering: no
  ```
- **Connection Lifecycle & Channel Management:**
  1. Upon connection, the backend authenticates the client via JWT cookie/header and reads `countryCode` and `UserRole`.
  2. The client is registered into an active in-memory connection registry `Map<string, SSEClient[]>`.
  3. Clients are subscribed to relevant channels:
     - `sse:dispatch:{countryCode}` — Broadcasts new bookings, job creations, assignments, and status transitions.
     - `sse:driver:{driverId}` — Directed dispatches and ticket updates for specific field technicians.
     - `sse:accounting:{countryCode}` — Ticket completion notices ready for expense stating.
- **Heartbeat & Resiliency:**
  - A periodic keepalive comment (`:keepalive\n\n`) is broadcast every 20 seconds to prevent proxy timeouts (Traefik, Nginx, cloud firewalls).
  - Every message includes an incremental timestamped `id` and explicit `event` name:
    ```text
    id: evt_1728224501000_1
    event: job:status_updated
    data: {"jobId":"...","jobCode":"JOB-CA-1042","status":"EN_ROUTE"}

    ```
  - Upon reconnection, the client transmits `Last-Event-ID`. The server replays missed events from an in-memory ring buffer (last 200 items per region) or triggers query invalidation.
- **Connection Cleanup:**
  - When client disconnects (`req.on('close')`), the server immediately purges the client from the active registry to eliminate memory leaks.

#### 3.7.2. Frontend SSE Consumer & In-Memory Synchronization
- **Native `EventSource` Consumer:** Implemented within `SSEProvider` or custom hook `useSSE`.
- **Event Dispatching:** SSE events do NOT write to browser disk storage. Instead, they trigger targeted in-memory query invalidations via TanStack Query:
  - `event: BOOKING_INGESTED` $\rightarrow$ `queryClient.invalidateQueries({ queryKey: ['bookings'] })`
  - `event: JOB_STATUS_UPDATED` $\rightarrow$ `queryClient.invalidateQueries({ queryKey: ['jobs'] })` & `queryClient.invalidateQueries({ queryKey: ['fleet-jobs'] })`
  - `event: JOB_ASSIGNED` $\rightarrow$ `queryClient.invalidateQueries({ queryKey: ['technician-jobs'] })`

### 3.8. Mapbox Proximity Engine & Single-View Dispatch Architecture
- **Address Geocoding:**
  - Customer addresses are geocoded using Mapbox Geocoding API (`mapbox.places`) during job creation on `/jobs` or verification on `/bookings`.
  - Resolves standardized address strings and coordinates (`longitude, latitude`).
- **Single-View Snapshot Calculation:**
  - Proximity calculations are executed **on-demand** when a dispatcher opens the job dispatch drawer, avoiding continuous background GPS tracking.
  - **Inputs:**
    1. Breakdown coordinates of selected job (`jobLng`, `jobLat`).
    2. Active driver location snapshot: Latest recorded coordinates of clocked-in drivers (`driverLng`, `driverLat`).
  - **Mapbox Matrix API Query:**
    - Queries Mapbox Matrix API (`/directions-matrix/v1/mapbox/driving-traffic`) with the destination and candidate driver locations.
    - Retrieves driving duration (`durations`) and distance (`distances`) matrices in a single network round-trip.
  - **Mapbox Directions API Traffic Layer:**
    - Evaluates traffic congestion for top candidate drivers to determine realistic arrival time (`estimatedArrivalAt`).
  - **Capacity & Shift Constraints:**
    - Engine cross-references driver active job status, remaining shift hours, and vehicle capability (e.g. commercial truck tire tools vs. passenger car tools) before presenting the ranked list to the dispatcher.

### 3.9. State Management Architecture & Strict sessionStorage Ban

#### The Anti-Pattern Prohibition:
Storing server data, job records, or query caches in `sessionStorage` or `localStorage` is **strictly forbidden**.

#### Architectural Justification:
1. **Multi-Tab Desynchronization:** `sessionStorage` is isolated per browser tab. If an agent updates a job on Tab A, Tab B's `sessionStorage` remains stale, leading to conflicting updates, double assignments, and race conditions.
2. **TanStack Query Lifecycle Disruption:** TanStack Query is designed as an optimized, reactive in-memory state engine. Hydrating from or syncing to `sessionStorage` causes cache hydration glitches, stale reads, and redundant re-renders.
3. **Serialization Latency:** Continuous `JSON.stringify()` and `JSON.parse()` cycles on large job lists blocks the JavaScript main thread and degrades UI fluidity.
4. **Security & PII Exposure:** Storing customer phone numbers, breakdown coordinates, and financial records in web storage exposes sensitive data to cross-site scripting (XSS) extraction.
5. **Memory Bloat:** Web storage has strict 5MB quota limits and poor garbage collection characteristics compared to the V8 engine's in-memory object heap.

#### Mandated Architecture:
- **Server Cache:** In-Memory TanStack Query v5 (`queryClient`) with `staleTime: 30_000` and SSE-driven reactive invalidations.
- **Client UI State:** In-Memory Zustand stores for modal toggles, active theme, and filter controls.
- **Authentication Tokens:** Signed HttpOnly cookies or minimal auth state.

### 3.10. Web Booking Verification Pipeline Topology
- **Stage 1 (Ingress):** Public submission enters via `POST /api/bookings` $\rightarrow$ stored with `status: UNVERIFIED_PUBLIC` $\rightarrow$ SSE broadcast `BOOKING_INGESTED` to `/bookings`.
- **Stage 2 (Verification Review):** Dispatcher validates customer identity, Mapbox address geocoding, service feasibility, and account eligibility in the verification side-panel.
- **Stage 3 (Active Job Transition):** Dispatcher approves $\rightarrow$ atomic status update to `PENDING` $\rightarrow$ routed to `/jobs` (retail) or `/fleet-jobs` (commercial fleet) $\rightarrow$ SSE broadcast `BOOKING_VERIFIED` & `JOB_CREATED`.

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
