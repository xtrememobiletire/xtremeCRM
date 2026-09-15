# System Architecture — XtremeCRM

## 1. Executive Summary
XtremeCRM is an operational CRM and dispatch platform tailored for mobile tire repair, seasonal tire changeovers, and emergency roadside automotive services operating across three international regions: **Canada (CAD)**, **United States (USD)**, and the **United Kingdom (GBP)**.

The architecture is derived directly from the system design blueprint ([`Xtreme-System-Design.svg`](file:///mnt/mydrive/Projects/xtremeCRM/context/Xtreme-System-Design.svg) and [`Xtreme-System-Design.png`](file:///mnt/mydrive/Projects/xtremeCRM/context/Xtreme-System-Design.png)). It emphasizes **high operational velocity, minimal latency, zero redundant data**, and immediate operational clarity across distinct user roles: Call Center Agents, Dispatchers, Mobile Technicians (Drivers), Accountants (Junior and Senior), B2B Fleets, Virtual Assistants, and Global Administrators.

---

## 2. Technology Stack & Component Topology

```text
+----------------------------------------------------------------------------------------------------+
|                                    FRONTEND CLIENTS (React 18 SPA)                                 |
|                                                                                                    |
|  [ Agent Portal ]       [ Dispatch Portal ]       [ Driver Portal ]       [ Accounting & Admin ]   |
|  - Active/Inactive      - Urgent Accordion        - Mobile Responsive     - Jr / Sr Portals        |
|  - Telnyx Screen Pop    - Distance Tool           - Gross & Net Display   - State Job Expenses     |
|  - Keyboard Intake      - Fleets Sidebar          - Arrival / Complete    - Payment Verification   |
|  - Customer Account     - Driver Messaging        - Cash Collection       - IT_B Royalty Ledger    |
|                                                                           - 4-Preset Date Filter   |
|                                                                                                    |
|  +-----------------------+   +--------------------------+   +----------------------------------+   |
|  |   Zustand Store       |   |   TanStack Query v5      |   |   Socket.io / SSE Client         |   |
|  |   (Client & UI State) |   |   (Server State & Cache) |   |   (Real-Time Fleet & Job Sync)   |   |
|  +-----------------------+   +-------------+------------+   +-----------------+----------------+   |
+--------------------------------------------|----------------------------------|--------------------+
                                             | REST API (JSON)                  | WebSockets / SSE
                                             v                                  v
+----------------------------------------------------------------------------------------------------+
|                                   BACKEND API (Express + TypeScript)                               |
|                                                                                                    |
|  +----------------------------------------------------------------------------------------------+  |
|  | Express Middleware Pipeline: Helmet, Morgan, CORS, Cookie-Parser, Rate-Limiting              |  |
|  +-----------------------------------------------+----------------------------------------------+  |
|                         |                        |                                                 |
|                         v                        v                                                 v
|  +-------------------------------+  +-----------------------------+  +--------------------------+  |
|  | Security & Ingestion Layer    |  | Socket.io / SSE Engine      |  | Prisma ORM Client        |  |
|  | - Passport-JWT & Bcrypt       |  | - Rooms: dispatch:{region}  |  | - Tenant Scoping Ext     |  |
|  | - Zod Request Validation      |  | - Rooms: driver:{driverId}  |  | - Type-Safe Query Gen    |  |
|  | - Multer File/Receipt Upload  |  | - Rooms: chat:job:{jobId}   |  | - Multi-Tenant DB Pool   |  |
|  | - Telnyx Inbound Webhook      |  |                             |  |                          |  |
|  +-------------------------------+  +-----------------------------+  +-------------+------------+  |
+------------------------------------------------------------------------------------|---------------+
                                                                                     |
                                                                                     v
+----------------------------------------------------------------------------------------------------+
|                                   PERSISTENCE & EXTERNAL SERVICES                                  |
|                                                                                                    |
|  +---------------------------------------------+  +---------------------------------------------+  |
|  | PostgreSQL Database (Dokploy Managed)       |  | Google Maps Platform API                    |  |
|  | - Single DB with indexed countryCode        |  | - Places Autocomplete & Geocoding           |  |
|  | - ACID Ledger for Cash, Expenses, & Royalties|  | - Distance Matrix API & Haversine Fallback  |  |
|  +---------------------------------------------+  +---------------------------------------------+  |
+----------------------------------------------------------------------------------------------------+
```

### Chosen Stack & Rationales

| Layer | Technology | Why Chosen & Operational Role |
| :--- | :--- | :--- |
| **Frontend Framework** | **React 18 + Vite** | Instant HMR, sub-second cold starts, broad ecosystem, high UI velocity. |
| **Client State** | **Zustand** | Zero boilerplate (unlike Redux), tiny bundle footprint (< 3KB), ideal for modal state, active country, agent active/inactive state, and active filters. |
| **Server State / Cache** | **TanStack Query v5** | Automatic cache invalidation, deduplicated requests, background refetching, optimistic updates for dispatch. |
| **Styling & Icons** | **Tailwind CSS + Lucide React** | Utility-first compile-time purge, predictable Red & White tokens, zero CSS runtime overhead. |
| **Form Engine** | **React Hook Form + Zod** | Zero-lag uncontrolled form inputs optimized for high-speed manual call agent keyboard data entry. Shared Zod validation with backend. |
| **Real-time Comms** | **Socket.io / SSE** | Real-time bidirectional communication with dedicated rooms (`dispatch:{region}`, `driver:{driverId}`, `chat:job:{jobId}`). Auto-reconnects on mobile drops. |
| **Telephony** | **Telnyx WebRTC & Webhooks** | High-performance SIP/WebRTC trunking. Triggers automatic inbound screen pop on active agents' screens with caller phone pre-filled. |
| **Backend Framework** | **Express (Node.js + TypeScript)** | Industry-standard, proven stability, massive ecosystem, transparent middleware pipeline. Clean TypeScript execution via modern tooling. |
| **Backend Validation** | **Zod** | Type-safe schema validation for all request bodies, query params, and route parameters with automatic TypeScript type inference. |
| **HTTP Logging** | **Morgan** | High-visibility HTTP request logging with formatted latency, status codes, and route tracking. |
| **HTTP Security** | **Helmet** | Sets secure HTTP response headers (HSTS, CSP, X-Frame-Options, noSniff) for enterprise-grade protection. |
| **CORS Middleware** | **CORS** | Configured for secure cross-origin requests from the React SPA with credentials (cookies) support. |
| **Cookie Parsing** | **Cookie-Parser** | Secure parsing of signed HttpOnly cookies containing authentication tokens. |
| **Authentication & RBAC** | **Passport + Passport-JWT** | Standardized authentication strategies, robust token extraction, and granular role-based access control. |
| **Password Hashing** | **Bcrypt** | Secure salt generation and password hashing for staff and customer user accounts. |
| **File / Receipt Uploads** | **Multer** | Multi-part form-data handling for uploading customer payment receipts, supplier material purchase slips, and driver cash deposit proofs. |
| **ORM** | **Prisma** | End-to-end TypeScript type safety, declarative migrations, Prisma Client Extensions for multi-tenancy. |
| **Database** | **PostgreSQL 16** | Relational integrity, native JSON support, ACID compliance for accounting and driver cash ledgers. Deployed via Dokploy. |
| **Deployment / Host** | **Dokploy on Hostinger VPS** | 16GB RAM KVM VPS, Docker Compose, 1-click PostgreSQL with automated daily S3 backups, Traefik auto-SSL. |

### Express + TypeScript Middleware Pipeline (Clean, Modular & Secure)

The Express backend leverages a standardized, ordered middleware pipeline designed for high performance, rigorous security, and zero boilerplate:

1. **`helmet()`:** Hardens HTTP response headers against clickjacking, MIME-type sniffing, and cross-site scripting.
2. **`cors()`:** Whitelists frontend origins with `credentials: true` for secure HttpOnly cookie transmission.
3. **`morgan('dev')`:** Formatted request logging capturing method, endpoint, status code, and execution time.
4. **`express.json()` & `express.urlencoded()`:** High-speed JSON body parsing with strict size limits.
5. **`cookieParser(process.env.COOKIE_SECRET)`:** Extracts signed cookies for session and token verification.
6. **`passport.initialize()`:** Initializes Passport JWT strategy for authenticated route protection.
7. **`validateRequest(zodSchema)`:** Reusable middleware that executes Zod schemas against `req.body`, `req.query`, and `req.params`, returning uniform 400 validation errors on failure.
8. **`multer({ storage, limits })`:** Handles multi-part file uploads for customer receipts and supplier material purchase slips.
9. **Centralized Error Handler (`errorHandler`):** Catch-all middleware converting uncaught errors, Zod validation issues, and database errors into predictable, standardized JSON responses (`{ success: false, message, error }`).

---

## 3. Core Subsystems

### 3.1. Call Intake & Multiple Agent Portal (Web & Responsive)
- **Agent Presence State:** Every call agent has an `Active` and `Inactive` status toggle. When inactive, calls bypass the agent; when active, the agent is available to receive inbound call events.
- **Telnyx Inbound Telephony & Screen Pop:**
  - When an inbound call hits the Telnyx phone number, a webhook triggers a screen pop modal on an active agent's screen.
  - The caller's phone number is already set/pre-filled in the intake form.
  - Background lookup automatically queries the customer database: if returning, past customer name, alternate numbers, vehicles, and tire sizes are populated instantly.
- **Lead Source Selector (Dropdown):** `1- Direct Call`, `2- Whatsapp`, `3- Website`.
- **Customer & Recipient Capture:**
  - `Self-Booking Or Recipient` toggle.
  - Full Name, Primary Phone Number, and Alternative Number (for someone else / on-scene contact).
- **Service Address:** Roadside emergency breakdown address captured via Google Maps Places Autocomplete and geocoded to `(serviceLat, serviceLng)`.
- **Vehicle & Tire Catalog:**
  - Vehicle Year, Make, Model.
  - Tire Size formatted with standard dimensions (e.g. `235/45R18` or dropdown for 235/245 widths, 17/18/19 inches).
- **Complete 16-Service Roadside Catalog:**
  1. Tire Repair (plug)
  2. Stem valve replacement
  3. New Tire Replacement
  4. Used tire replacement
  5. NEW RIM replacement
  6. USED RIM replacement
  7. Tire Swap (ON RIM)
  8. Tire Swap (OFF RIM)
  9. Spare Tire Change
  10. Tire Rotation
  11. Battery Installation
  12. Battery Replacement
  13. Jump Start
  14. Battery Booster
  15. Lock Smith Service
  16. Towing Service
- **Service Priority & ETA:**
  - `1- Urgent`, `2- Standard`, `3- Future Booking` (with Date & Time picker).
  - Manual `ETA` entered by call agent or estimated via Google Maps.
- **Customer User Account Auto-Creation:**
  - *"After all this make user account"* — Upon booking, the system auto-provisions a customer account (`isUserAccountCreated = true`), allowing the stranded motorist to track their driver's live approach online via SMS link. Passwords hashed with Bcrypt.
- **Billing & Tax Controls:**
  - Payment Options in regional currency (e.g., CAD: `$160 + tax or - tax(box)` where 13% tax = `$20.80`, Total: `$180.80` / `$180`).
  - Dedicated checkbox toggle to apply or exempt tax (`+ tax` or `- tax(box)`).
  - Payment Methods: `1- E-Transfer`, `2- POS` (mobile card terminal), `3- Cash`, `4- MOTO` (telephone payment).
- **Call Dispositions:**
  1. `1- Booked - Appointment Booked`
  2. `2- Relevant(Not converted)- RNC`
  3. `3- Bussiness (Wrong Number) -WN`
  4. `4- Irrelevant(Another service)- IR`
  5. `5- Appointment Cancelled By CX`

### 3.2. Landing Page Public Booking Subsystem
- Public self-booking widget hosted on the landing page (`/`).
- Stranded drivers or customers can self-fill the booking form directly from their phone browser.
- Submissions are validated via Zod and ingested with status `PENDING` and flag `isVerified = false`.
- Call agents receive verification tasks to make an outbound confirmation call or SMS to confirm service details before assigning a mobile van.

### 3.3. Dispatch Manager Portal & Fleet Management
- **Appointments Board:** Valid booked appointments are presented in clean, prioritizeable queues.
- **Urgent Queue Accordion:**
  - Urgent count badge (`How much and click and open`).
  - Expandable row accordion (`open the row`) allowing the dispatcher to immediately view customer notes, tire size, vehicle, and exact roadside GPS pin.
- **Interactive Proximity & Arbitrary Address Distance Tool:**
  - *"add a address of any location and automatically measure the distance from the driver"*
  - Dispatchers can type any address into a dedicated utility box, and the system instantly measures driving distance from all active mobile technicians using Google Distance Matrix API with Haversine fallback.
- **Driver Assignment:** Single-click dropdown to assign the nearest eligible mobile technician. Persists `driverId` and `assignedAt`.
- **Fleet Accounts & Location Tracking:** Full oversight of driver accounts, active shift status, and live GPS location coordinates.
- **Driver Cash Tracking Section:** Dedicated ledger section tracking physical cash collected by drivers in the field (`cashInHandCents`).
- **Driver Messaging Section:** Real-time two-way chat section between dispatcher and driver on the job (`chat:job:{jobId}`).
- **Job Status Pipeline & Payment Verification:**
  - Pipeline: `Pending` $\rightarrow$ `Arrival Status` (`EN_ROUTE`, `ARRIVED`) $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `Completed`.
  - When the job is completed by the driver, the dispatcher reviews the ticket and verifies that payment has been collected/settled.
- **Fleets Sidebar Page:** Dedicated sidebar item `Fleets` for B2B fleet account onboarding and management.

### 3.4. WorkFlow for Fleets Sign-Up (B2B Fleet Accounts)
- **Lead Generation & Cold Outreach:**
  - ViciDial integrated with BulkVS used for B2B telemarketing.
  - Virtual Assistant (VA) identifies commercial fleet leads, inserts them into ViciDial, conducts outreach calls, and transfers warm leads to the Dispatch Manager.
- **Fleet Onboarding in CRM:**
  - Dispatch Manager opens the sidebar `Fleets` page and clicks `[ + Add Fleet ]` to register the fleet profile.
  - Captures company name, contact info, fleet size, vehicle/truck specifications, and billing details.
- **Contract Execution & Verified Status:**
  - Contract is signed electronically $\rightarrow$ Fleet is upgraded to **Verified B2B Partner**.
  - Dedicated service history tracks all truck services, tire replacements, and road calls executed for that fleet.
- **Virtual Assistant Commission Ledger:**
  - The Virtual Assistant whose contact number is linked to the fleet receives **$2–$3 for every completed job** performed for that fleet account.
  - Automatically logged in `FleetCommissionLedger` upon job completion.

### 3.5. Mobile Driver Portal (Field Execution)
- Lightweight, outdoor-optimized mobile web/PWA interface for van technicians.
- Real-time job assignment push via Socket.io / SSE.
- Navigation link (`geo:` or Google Maps intent) to breakdown coordinates.
- **Gross & Net Display:** Driver portal displays driver Gross and Net earnings for the completed job and shift period.
- **Status Stepper:** `[ START DRIVING ]` $\rightarrow$ `[ ARRIVED ]` $\rightarrow$ `[ COMMENCE WORK ]` $\rightarrow$ `[ COMPLETE JOB ]`.
- **Payment Collection Modal:** Driver records payment method (`Cash` or `POS`); cash collections increment the driver's local cash-in-hand ledger.
- **In-App Messaging:** Direct messaging tab to communicate with the dispatch manager.

### 3.6. Accountant Department (Junior & Senior Portals) & Job Expense Stating
- **Two-Tier Portal Structure:** `Senior Accountant` and `Junior Accountant`.
- **Active Role: Stating Job Expenses:**
  - The accountant does not merely verify payments—they actively **state / record the exact expenses incurred for each completed job**.
  - **Which job took how much expense:** Every job ticket receives an explicit cost attribution recorded by the accountant.
  - **Repairer Fees:** The accountant inputs the exact labor/service fee paid to the mobile repairer/technician (`repairerFeeCents` / `driverPayoutCents`).
  - **Material Fees:** The accountant inputs the exact parts/material cost incurred (`materialCostCents` / `tireMaterialCostCents`), including new/used tires, rims, valves, patches, or battery units.
  - **Additional Expenses:** Optional incidental job expenses (`otherExpenseCents` e.g., disposal fee, toll charge).
- **Payment Verification:**
  - Dedicated boolean verification flag: `isPaymentVerified` (boolean) + `paymentVerifiedById` + `paymentVerifiedAt`.
  - Accountant audits customer payment proof (POS settlement slip, Interac e-Transfer reference, or driver cash handover).
- **Receipt Attachments via Multer:**
  - Director / Manager / Accountant uploads the official customer invoice receipt for Customer Paid (`CP`).
  - Junior Accountant uploads supplier tire/material purchase receipts for Material Cost (`TC`).
  - Multi-part file uploads handled safely by Express Multer middleware into organized storage.
- **P&L Cost Formula:**
  $$\text{Net Profit} = \text{CP} - \text{TC} - \text{DC}$$
  *(Customer Paid minus Material/Tire Cost minus Repairer/Driver Fee)*
- **IT Platform Royalty (`IT_B`):**
  - Deducted on every completed job:
    - Canada: **$1.50 CAD**
    - USA: **$1.00 USD**
    - UK: **£1.00 GBP / POUND**
  - Dedicated accounting widget displaying regional fee balances and **Total Net of IT_B** ($\text{Net Profit} - \text{IT\_B}$).
- **Time Period Filter Presets:**
  - Dropdown filter with exact presets: `Yesterday`, `Last 3 Days`, `One Week`, `Monthly Amount`.

### 3.7. Admin Portal (\"Admin sees every thing\")
- Global administrative portal providing omni-channel oversight across Canada, United States, and United Kingdom.
- Real-time visibility into all active calls, booking rates, dispatch queues, fleet accounts, driver cash balances, and company-wide financial P&L statements.

---

## 4. Dokploy Deployment & Clean Multi-Tenancy Architecture
The system runs on a **Hostinger 16GB KVM VPS deployed via Dokploy**. It uses a **Single PostgreSQL Database** with **Indexed `countryCode` Tenant Scoping**, eliminating the RAM and maintenance overhead of running multiple database instances.

```text
+-------------------------------------------------------------------------+
| DOKPLOY INFRASTRUCTURE (Hostinger 16GB KVM VPS)                         |
|                                                                         |
|  [ Dokploy Managed PostgreSQL ] <── (1 Service, 1-Click Auto Backups)  |
|               |                                                         |
|               | DATABASE_URL (Single Connection Pool, ~250MB RAM)       |
|               v                                                         |
|  [ Express (TypeScript) Backend Container ]                             |
|         |                                                               |
|         +---> Express Tenant Middleware & Prisma Extension              |
|         |     Auto-injects { where: { countryCode } }                   |
|         |     Prevents cross-country data leakage                       |
|         |                                                               |
|         +---> Raw Prisma (for Director / Admin global P&L)              |
|               Aggregates US + CA + UK in 1 fast query                   |
|               v                                                         |
|  [ React Frontend Container ] (Served via Vite / Nginx / Dokploy)       |
+-------------------------------------------------------------------------+
```

### Clean Architecture Guarantees
- **Single Model per Entity:** Exactly one `User`, one `Job`, one `Customer`, and one `Fleet` model. Zero duplicate or country-prefixed tables.
- **Automated Query Scoping:** Express middleware extracts `req.countryCode` from the authenticated user or `X-Region` header, and Prisma Client Extension automatically filters queries.
- **Global Accounting Access:** Directors and Senior Accountants can run cross-country reports (e.g., total IT_B fees across all countries) in a single fast query.
- **Zero-Overhead Country Expansion:** Expanding to a new country (e.g. Australia `AU`) requires **zero database provisioning and zero schema migrations**—simply declare the country code in `server/config/regions.ts`.

---

## 5. Scalability & Simplicity Safeguards (Ponytail Principles)
1. **Single Monolith / Unified Repo:** Backend Express API and Frontend React SPA in one repository with clear separation (`/server` and `/client`).
2. **Derived Fields Over Duplication:** Subtotal, tax, and net margins are computed deterministically or recorded in a single `JobFinancial` record—never duplicated across tables.
3. **Strict Money Handling:** All financial figures are stored in integer cents (`*_cents`) with an explicit currency code. Floating-point arithmetic is strictly prohibited.
