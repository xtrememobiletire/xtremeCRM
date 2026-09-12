# System Architecture — XtremeCRM

## 1. Executive Summary
XtremeCRM is an operational CRM and dispatch platform tailored for mobile tire repair and roadside automotive services operating in three international regions: **Canada (CAD)**, **United States (USD)**, and the **United Kingdom (GBP)**.

The architecture emphasizes **high throughput, minimal latency, zero redundant data**, and immediate operational clarity across four distinct roles: Call Agents, Dispatchers, Mobile Technicians (Drivers), and Accountants.

---

## 2. Technology Stack

```text
+-------------------------------------------------------------------------+
|                         FRONTEND (React 18 SPA)                         |
|                                                                         |
|   +-----------------------+              +--------------------------+   |
|   |   Zustand Store       |              |   TanStack Query v5      |   |
|   |   (Client & UI State) |              |   (Server State & Cache) |   |
|   +-----------------------+              +-------------+------------+   |
|               |                                        |                |
|               |                                        | REST API       |
|               v                                        v (JSON)         |
|   +-----------------------+              +--------------------------+   |
|   |   Tailwind CSS UI     |<-------------|   Socket.io Client       |   |
|   |   (Red & White Theme) |              |   (Real-Time Fleet Sync) |   |
|   +-----------------------+              +-------------+------------+   |
+--------------------------------------------------------|----------------+
                                                         |
                         +-------------------------------+----------------+
                         | WebSocket (Socket.io) / HTTPS REST             |
                         v                                                v
+-------------------------------------------------------------------------+
|                         BACKEND API (Fastify)                           |
|                                                                         |
|   +-----------------------+              +--------------------------+   |
|   |  Fastify Core Server  |              |   Auth & RBAC            |   |
|   |  (TypeBox Validation) |              |   (JWT + HttpOnly Cookie)|   |
|   +-----------+-----------+              +--------------------------+   |
|               |                                                         |
|               +-------------------------------------------+             |
|               v                                           v             |
|   +-----------------------+              +--------------------------+   |
|   |   Socket.io Server    |              |   Prisma ORM Engine      |   |
|   |   (Rooms:dispatch/job)|              |   (Type-safe Query Gen)  |   |
|   +-----------------------+              +-------------+------------+   |
+--------------------------------------------------------|----------------+
                                                         |
                                                         v
+-------------------------------------------------------------------------+
|                     PERSISTENCE & EXTERNAL SERVICES                     |
|                                                                         |
|   +------------------------------------+  +--------------------------+  |
|   |  PostgreSQL Database (Dokploy)     |  |  Google Maps API         |  |
|   |  (ACID, Single DB Multi-Tenant)    |  |  (Geocode & Distance)    |  |
|   +------------------------------------+  +--------------------------+  |
+-------------------------------------------------------------------------+
```

### Chosen Stack & Rationales

| Layer | Technology | Why Chosen (Ponytail / High Speed) |
| :--- | :--- | :--- |
| **Frontend Framework** | **React 18 + Vite** | Instant HMR, sub-second cold starts, broad ecosystem, high UI velocity. |
| **Client State** | **Zustand** | Zero boilerplate (unlike Redux), tiny bundle footprint (< 3KB), ideal for modal state, active country, and active filters. |
| **Server State / Cache** | **TanStack Query v5** | Automatic cache invalidation, deduplicated requests, background refetching, optimistic updates for dispatch. |
| **Styling & Icons** | **Tailwind CSS + Lucide React** | Utility-first compile-time purge, predictable Red & White tokens, zero CSS runtime overhead. |
| **Form Engine** | **React Hook Form + Zod** | Zero-lag uncontrolled form inputs optimized for high-speed manual call agent keyboard data entry. |
| **Real-time Comms** | **Socket.io** | Built-in connection management, rooms/namespaces (`job:id`, `dispatch:region`), auto-reconnection on mobile network drops. |
| **Backend Framework** | **Fastify** | 2x-3x faster than Express, built-in schema validation, plugin encapsulation, low memory overhead. |
| **ORM** | **Prisma** | End-to-end TypeScript type safety, declarative migrations, Prisma Client Extensions for multi-tenancy. |
| **Database** | **PostgreSQL 16** | Relational integrity, native JSON support, ACID compliance for accounting ledgers. Deployed via Dokploy. |
| **Deployment / Host** | **Dokploy on Hostinger VPS** | 16GB RAM KVM VPS, Docker Compose, 1-click PostgreSQL with automated daily S3 backups, Traefik auto-SSL. |
| **Telephony Architecture** | **Decoupled / Standalone** | Agents use their dialer independently. Zero webhook/pop-up coupling into CRM state. Clean, deterministic, manual agent intake. |

### Fastify Developer Velocity Suite (Build Faster, Write Less Boilerplate)

To maximize backend velocity and minimize boilerplate, we use Fastify's official first-party ecosystem:

1. **`@fastify/autoload`:**
   * Automatically scans and registers all plugins and routes based on folder structure (`/plugins`, `/routes/api/jobs`, etc.).
   * Eliminates 100% of manual `app.register()` route wiring.
2. **`@sinclair/typebox` + `@fastify/type-provider-typebox`:**
   * Define schema ONCE with TypeBox. Fastify uses it for:
     - Blazing-fast runtime JSON validation and serialization via `fast-json-stringify`.
     - Direct compile-time TypeScript type inference without creating separate interfaces.
3. **`@fastify/swagger` + `@fastify/swagger-ui`:**
   * Automatically generates interactive OpenAPI documentation and Swagger UI at `/docs` directly from TypeBox route schemas with zero manual documentation work.
4. **`@fastify/jwt` & `@fastify/cookie`:**
   * Ultra-fast authentication tokens stored in secure HttpOnly cookies.
5. **`@fastify/sensible`:**
   * Standardized HTTP error helpers (`reply.notFound()`, `reply.badRequest()`, `reply.unauthorized()`).
6. **`@fastify/cors`:**
   * Fast, secure Cross-Origin Resource Sharing for the React SPA.

---

## 3. Core Subsystems

### 3.1. Call Intake & Booking Engine
- **Multi-channel ingest:** Web booking, WhatsApp webhook, and direct phone call.
- **Customer Resolution:** Looks up customer by phone number. If exists, associates vehicle; if new, creates `Customer` and `Vehicle` atomically with the `Job`.
- **Address & Distance Geocoding:** Service address geocoded once to `(latitude, longitude)` on creation. Distance to drivers is calculated on-demand via Haversine / Distance Matrix API.
- **Call Disposition Engine:** Every call outcome is logged (Booked, Relevant Not Converted, Wrong Number, Irrelevant, Cancelled).

### 3.2. Dispatch & Fleet Engine
- **Queue Partitioning:** Jobs grouped by Urgency (`URGENT`, `STANDARD`, `FUTURE`) and Region (`CA`, `US`, `UK`).
- **Driver Matching:** Real-time distance calculation from Driver’s last known coordinates to Job coordinates.
- **Two-way Socket Rooms:**
  - `dispatch:{region}`: Broadcasts new jobs, cancellations, and status changes to dispatchers.
  - `driver:{driverId}`: Direct dispatch alerts and status changes to the technician's mobile view.
  - `job:{jobId}`: Real-time driver arrival ETA and status progression.
### 3.3. Job Lifecycle State Machine
```text
  [ Customer Inbound / Web / WhatsApp ]
                    |
                    v
            +---------------+
            |    PENDING    +-----------------------+
            +-------+-------+                       |
                    | Dispatcher assigns Driver     |
                    v                               |
            +---------------+                       |
            |   ASSIGNED    +---------------+       |
            +-------+-------+               |       | Customer cancels /
                    | Driver taps 'Driving' |       | Cancellation disposition
                    v                       |       |
            +---------------+               |       |
            |   EN_ROUTE    |               v       v
            +-------+-------+           +---------------+
                    | Driver arrives    |   CANCELLED   |
                    v                   +---------------+
            +---------------+
            |    ARRIVED    |
            +-------+-------+
                    | Commences tire service
                    v
            +---------------+
            |  IN_PROGRESS  |
            +-------+-------+
                    | Service done + Payment collected
                    v
            +---------------+
            |   COMPLETED   |
            +-------+-------+
                    | Junior / Senior Accountant audits
                    v
            +---------------+
            |    AUDITED    |
            +---------------+
```

### 3.4. Financial & Reconciliation Engine
- **Strict Money Storage:** All amounts stored as **integer cents** (e.g. `$160.00` = `16000`) with an explicit `currency` enum (`CAD`, `USD`, `GBP`). Never floating point.
- **P&L Margin Formula:**
  $$\text{Net Margin} = \text{Customer Paid} - \text{Tire/Material Cost} - \text{Driver Cost}$$
- **Platform IT Fee (`IT_B`):**
  - Canada (`CAD`): **$1.50 CAD**
  - USA (`USD`): **$1.00 USD**
  - UK (`GBP`): **£1.00 GBP**
- **Cash Reconciliation:** Drivers track cash collected in hand. Dispatcher and Accountant verify receipt and settle driver payout minus collected cash.
- **Two-Tier Accounting Access:** Junior Accountant audits and attaches receipts; Senior Accountant / Director approves payout and batch exports.

---

## 4. Dokploy Deployment & Clean Multi-Tenancy Architecture
The system is deployed on a **Hostinger 16GB VPS using Dokploy**. It uses a **Single PostgreSQL Database** with **Indexed `countryCode` Tenant Scoping**, eliminating the RAM and maintenance overhead of running multiple database instances.

```text
+-------------------------------------------------------------------------+
| DOKPLOY INFRASTRUCTURE (Hostinger 16GB KVM VPS)                         |
|                                                                         |
|  [ Dokploy Managed PostgreSQL ] <── (1 Service, 1-Click Auto Backups)  |
|               |                                                         |
|               | DATABASE_URL (Single Connection Pool, ~250MB RAM)       |
|               v                                                         |
|  [ Fastify Backend Container ]                                          |
|         │                                                               |
|         ├───> Prisma Client Extension (tenant-db.ts)                    |
|         │     Auto-injects { where: { countryCode } }                   |
|         │     Prevents cross-country data leakage                       |
|         │                                                               |
|         └───> Raw Prisma (for Director / Accountant global P&L)         |
|               Aggregates US + CA + UK in 1 fast query                   |
|               v                                                         |
|  [ React Frontend Container ] (Served via Vite / Nginx / Dokploy)       |
+-------------------------------------------------------------------------+
```

### Why This is 100% Clean (Zero Model Duplication)
- **Single Model per Entity:** There is only one `User`, one `Job`, and one `Customer` model. No duplicate tables or company-prefixed entities.
- **Automated Query Scoping:** Fastify's Prisma extension automatically filters queries based on the user's active country (`req.countryCode`), so agents and drivers only see their country's records.
- **Global Accounting Access:** Directors and Senior Accountants can run cross-country reports (e.g. total IT_B fees across all countries) in a single fast query.
- **Instant Country Expansion:** Expanding to Australia (`AU`) or Germany (`DE`) requires **zero database provisioning and zero schema migrations**—simply add the country code to `server/config/regions.ts`.

---

## 5. Scalability & Simplicity Safeguards (Ponytail Principles)
1. **Single Monolith / Unified Repo:** Backend API and Frontend in one repository with clear separation (`/server` and `/client`). No microservices overhead.
2. **Derived Fields Over Duplication:** Subtotal, tax, and net margins are computed deterministically or recorded in a single `JobFinancial` record—never duplicated across tables.
3. **Optimistic UI with Fallback:** Driver status transitions trigger immediate UI feedback via Zustand while TanStack Query reconciles with server response.
