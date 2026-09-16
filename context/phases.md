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
    - `User` (with `isAgentActive` and inlined driver telemetry `currentLat`, `currentLng`, `cashInHandCents`), `Customer`, `Vehicle`.
    - `Fleet` and `FleetCommissionLedger` ($2–$3 VA commission per job).
    - `Job`, `JobServiceItem`, `JobMessage`, `DriverCashLedger`.
    - Inlined `Job` financials with active accountant expense stating fields (`materialCostCents`, `repairerFeeCents`, `otherExpenseCents`, `expenseNotes`) and payment verification trail (`paymentVerifiedById`, `paymentVerifiedAt`).
  - Seed script with the complete 16-Service Catalog and initial seed users across all roles (`ADMIN`, `CALL_AGENT`, `DISPATCHER`, `DRIVER`, `ACCOUNTANT`, `VIRTUAL_ASSISTANT`).
  - React 18 (Vite) frontend with Tailwind CSS (Red & White design tokens), Zustand store, TanStack Query provider, and folder mirroring (`src/pages/` $\rightarrow$ `src/components/pages/`).
  - Role-based route protection for both REST API endpoints and frontend views.

---

## Phase 2: Inbound Call Agent Intake & Telnyx WebRTC Softphone Module
- **Objective:** Embedded browser digital phone, instant screen pop, auto-prefilled caller matching, and rapid keyboard roadside intake.
- **Deliverables:**
  - Agent Active/Inactive presence toggle in top navigation bar.
  - **Embedded Telnyx WebRTC Softphone (`@telnyx/webrtc`):**
    - Backend on-demand token endpoint (`GET /api/telephony/token`) minting short-lived WebRTC JWTs.
    - React softphone component with 1-click answer (`Spacebar`), mute, hold, and hangup.
    - 1-click outbound click-to-call on all customer and driver phone numbers.
  - **Dual-Trigger Screen Pop Service:**
    - Dual event handling: WebRTC browser event + server webhook (`POST /api/telephony/webhook`) over Socket.io.
    - Auto-prefills caller phone number (`phone`), defaults `DIRECT_CALL`, and initiates immediate customer/fleet database match.
  - **Structured Intake Form (Auto vs. Agent-Entered Separation):**
    - *Auto-Populated:* Caller number, lead source, timestamp, matching returning customer profile, and saved fleet vehicles.
    - *Agent-Entered Live:* Breakdown location (Google Places Autocomplete), on-scene recipient info, vehicle & tire size confirmation, 16-service picker, urgency & agreed ETA, base price & tax toggle, payment method, customer account auto-creation toggle, and problem notes.
  - **Mandatory 5-Disposition Call Logging:**
    - Modal cannot be dismissed without logging outcome: `Booked`, `RNC`, `WN`, `IR`, `Appointment Cancelled By CX`.
  - **Public Landing Page Booking Widget (`/`):**
    - Ingests self-bookings with `isVerified = false` validated via Zod.
    - Injects outbound verification task into active agents' queue.

---

## Phase 3: Dispatch & Fleet Logistics Hub
- **Objective:** Real-time dispatching board, proximity distance measurement, driver messaging, and B2B fleet onboarding.
- **Deliverables:**
  - Appointments Board with Urgent, Standard, and Future queues.
  - Urgent Queue Accordion: Urgent count badge (`How much and click and open`) + expandable row accordion (`open the row`) revealing roadside coordinates and service spec.
  - Proximity & Custom Address Distance Tool:
    - Dedicated utility box allows typing any custom address to automatically measure driving distance and ETA from all active drivers using Google Distance Matrix API with Haversine fallback.
  - Single-click Driver Assignment dropdown persisting `driverId` and `assignedAt`.
  - Dedicated Driver Messaging Drawer: Two-way real-time chat between dispatcher and driver per job ticket (`chat:job:{jobId}`).
  - Driver Cash in Hand Tracking section: Monitors physical cash held by drivers (`cashInHandCents`).
  - B2B Fleets Sidebar Page (`Fleets`):
    - `[ + Add Fleet ]` modal capturing corporate account details and vehicle fleet sizes.
    - Electronic contract verification status upgrade to **Verified Partner**.
    - Dedicated fleet service history.
    - Automatic calculation of Virtual Assistant commissions ($2–$3 per completed job).
  - Real-time Socket.io / SSE event distribution synchronizing dispatch board.

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
