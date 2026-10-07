# Implementation Phases — XtremeCRM

## Phase 1: Core Foundation & Infrastructure
- **Objective:** Establish monorepo structure, Express + TypeScript backend, database models, authentication, and base UI layout.
- **Deliverables:**
  - Express server initialization with TypeScript and full middleware suite:
    - `helmet`: Secure HTTP headers.
    - `cors`: Cross-Origin Resource Sharing with credentials.
    - `morgan`: Request logging.
    - `cookie-parser`: Signed cookie extraction for HttpOnly auth tokens.
    - `passport` + `passport-jwt`: Authentication and role-based guards.
    - `bcrypt`: Secure password hashing.
    - `multer`: File/receipt upload handling for customer receipts and supplier slips.
    - `zod`: Request validation middleware (`validateRequest`) and TypeScript type inference.
    - Centralized error handling middleware.
  - PostgreSQL database connection with Prisma ORM migrations (`schema.prisma`) including:
    - `User` (with unified `isOnline` presence and soft-delete `deletedAt`), `Customer`, `Vehicle`.
    - `Fleet` and `FleetCommissionLedger` ($2–$3 VA commission per job).
    - `Job`, `JobServiceItem`, `JobMessage`, `DriverCashLedger`.
    - Inlined `Job` financials with active accountant expense stating fields (`materialCostCents`, `repairerFeeCents`, `otherExpenseCents`, `expenseNotes`) and payment verification trail (`paymentVerifiedById`, `paymentVerifiedAt`).
  - Seed script with the complete 16-Service Catalog and initial seed users across all roles (`ADMIN`, `CALL_AGENT`, `DISPATCHER`, `DRIVER`, `ACCOUNTANT`, `VIRTUAL_ASSISTANT`).
  - React 18 (Vite) frontend with Tailwind CSS (Red & White design tokens), Zustand store, TanStack Query provider, and folder mirroring (`src/pages/` $\rightarrow$ `src/components/pages/`).
  - Role-based route protection for both REST API endpoints and frontend views.
  - Real-time Server-Sent Events (SSE) infrastructure initialized on backend (`GET /api/events/stream`) with regional channel partitioning (`CA`, `US`, `UK`), keepalive heartbeat, and frontend `EventSource` consumer.

---

## Phase 2: Operational Triage, Web Booking Verification Pipeline & External Dialer Queue
- **Objective:** High-velocity roadside intake CRUD, isolated web booking verification queue, external dialer workflow alignment, and VA outbound callback queue.
- **Deliverables:**
  - **High-Velocity Intake Form (`/jobs/new`):**
    - Instant background search for returning customers and contracted fleet accounts.
    - Mapbox Address Autocomplete resolving coordinates and standardized addresses.
    - 16-Service Roadside Catalog selector, urgency toggle, and price/tax calculation.
    - Mandatory 5-disposition logging (`Booked`, `RNC`, `WN`, `IR`, `Cancelled`).
  - **External Dialer Integration & Telnyx Code Preservation:**
    - Live telephony delegated to external partner platform; intake form supports caller ID pre-filling via URL parameters or incoming webhooks.
    - Telnyx softphone services and WebRTC components are fully preserved and retained under a modular feature flag for future direct re-activation.
  - **Web Booking Verification Pipeline (`/bookings`):**
    - Isolated `/bookings` triage table staging incoming public web submissions in `UNVERIFIED_PUBLIC` status.
    - Verification side-panel enabling dispatchers to confirm customer phone, geocode address, validate service capacity, and approve or reject submissions.
    - 1-click promotion elevating approved bookings to active jobs (`/jobs` or `/fleet-jobs`).
  - **Virtual Assistant Outbound Campaign Workspace:**
    - Bulk CSV Lead Upload interface (`/va-upload`) auto-tagging leads to the uploading VA.
    - Dedicated Outbound Call Queue (`/outbound`) displaying assigned leads, callback schedules, and disposition controls.

---

## Phase 3: Route Segmentation, Fleet Logistics & Mapbox Proximity Hub
- **Objective:** Segmented dispatch boards, Mapbox single-view proximity calculation, fleet SLA management, and real-time SSE event synchronization.
- **Deliverables:**
  - **Segmented Dispatch Boards:**
    - **Standard Jobs (`/jobs`):** Urgent and standard retail queues with expandable detail drawers.
    - **Fleet Jobs (`/fleet-jobs`):** Dedicated commercial grid with corporate SLA timers, contracted rate cards, and certified driver filtering.
  - **Mapbox Proximity Engine:**
    - Single-view on-demand proximity calculation using Mapbox Matrix API (travel duration and distance to candidate drivers).
    - Mapbox Directions API with live traffic congestion snapshot.
    - Dynamic driver ranking with capability and shift constraint filtering.
  - **Driver Assignment & Messaging:**
    - Single-click driver assignment dropdown dispatching real-time SSE event to field drivers.
    - Two-way dispatcher-driver job chat drawer (`JobMessage`).
  - **Driver Cash Accountability:**
    - Cash-in-hand tracking section monitoring physical cash collections (`DriverCashLedger`).
  - **B2B Fleets Directory (`/fleets`):**
    - Corporate fleet management, vehicle directory, driver directory, and contract verification.
    - Automated Virtual Assistant commission ledgering ($2–$3 per completed job).
  - **Full SSE Real-Time Synchronization:**
    - SSE event broadcast updating `/jobs`, `/fleet-jobs`, and `/bookings` across all active dispatcher consoles without polling.

---

## Phase 4: Driver Mobile Execution View (PWA)
- **Objective:** Outdoor high-contrast mobile interface for mobile van technicians.
- **Deliverables:**
  - Responsive PWA layout with high-contrast red/white action buttons for outdoor sunlight visibility.
  - One-tap GPS navigation link (`geo:` or Google Maps intent to breakdown address).
  - Driver Gross & Net earnings display per job and pay-period.
  - Status progression stepper:
    - `[ START DRIVING ]` $\rightarrow$ sets `EN_ROUTE`
    - `[ I HAVE ARRIVED ]` $\rightarrow$ sets `ARRIVED`
    - `[ COMMENCE WORK ]` $\rightarrow$ sets `IN_PROGRESS`
    - `[ COMPLETE JOB ]` $\rightarrow$ triggers payment collection modal.
  - Cash in Hand collection logger: Updates `User.cashInHandCents` and creates `DriverCashLedger` entry.
  - In-app Dispatch Chat tab for immediate coordination with dispatchers.

---

## Phase 5: Accounting, Expense Stating & Financial Reconciliation
- **Objective:** Financial auditing, active job expense stating, margin calculations, and strict regional country reporting (zero blended revenue).
- **Deliverables:**
  - **Job Costing & Expense Stating Interface:**
    - Accountant explicitly inputs/states the expenses for each completed job:
      - Material Fees (`materialCostCents` - wholesale tires, parts, patches, valves).
      - Repairer Fees (`repairerFeeCents` - driver/technician labor fee).
      - Other incidental expenses (`otherExpenseCents`) with explanatory notes.
    - Supplier parts receipt and customer invoice receipt upload/attachment handled by Multer.
  - **Payment Verification Audit:**
    - Dynamic verification state (`paymentVerifiedById != null || paymentStatus == VERIFIED_PAID`) with verifier identity and audit timestamp.
    - Accountant audits stated expenses, attaches receipts, verifies payment, and finalizes payout approval.
  - **Automated Dynamic Net Margin Calculation:**
    $$\text{Total Job Expense} = \text{Material Fees} + \text{Repairer Fees} + \text{Other Expenses}$$
    $$\text{Net Profit} = \text{Customer Paid (CP)} - \text{Total Job Expense}$$
  - **IT Platform Royalty (`IT_B`) Ledger:**
    - Fixed fee deduction per job: **150 cents** ($1.50 CAD) / **100 cents** ($1.00 USD) / **100 pence** (£1.00 GBP).
    - Displays Total Net of IT_B.
  - **Virtual Assistant Fleet Commission Settlement:**
    - Batch audit and payout interface for VA fleet commissions ($2–$3/job).
  - **Strict Regional Country Reports (Zero Mixing / Zero Blended Revenue):**
    - 4-Preset Date Filter: `Yesterday`, `Last 3 Days`, `One Week`, `Monthly Amount`.
    - Completely separate regional summary cards for Canada (CAD), USA (USD), and UK (GBP).
    - Strict zero-sum isolation: Never compute blended or cross-currency total revenue. Each country functions as an independent business.
