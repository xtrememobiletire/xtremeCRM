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
    - `User` (with `isAgentActive`), `DriverProfile`, `Customer`, `Vehicle`.
    - `Fleet` and `FleetCommissionLedger` ($2–$3 VA commission per job).
    - `Job`, `JobServiceItem`, `JobMessage`, `DriverCashLedger`.
    - `JobFinancial` with active accountant expense stating fields (`materialCostCents`, `repairerFeeCents`, `otherExpenseCents`, `expenseNotes`) and payment verification flags (`isPaymentVerified`, `paymentVerifiedById`, `paymentVerifiedAt`).
  - Seed script with the complete 16-Service Catalog and initial seed users across all roles (`ADMIN`, `CALL_AGENT`, `DISPATCHER`, `DRIVER`, `ACCOUNTANT_JR`, `ACCOUNTANT_SR`, `VIRTUAL_ASSISTANT`).
  - React 18 (Vite) frontend with Tailwind CSS (Red & White design tokens), Zustand store, TanStack Query provider, and folder mirroring (`src/pages/` $\rightarrow$ `src/components/pages/`).
  - Role-based route protection for both REST API endpoints and frontend views.

---

## Phase 2: Inbound Call Agent Intake & Disposition Module
- **Objective:** High-speed call booking modal, Telnyx screen pops, and conversion tracking.
- **Deliverables:**
  - Agent Active/Inactive presence toggle in top navigation bar.
  - Telnyx Webhook & Screen Pop service:
    - Auto-detects inbound call and pops modal on active agent screen with caller phone number pre-filled.
    - Instant background lookup queries customer and past vehicle records.
  - Fast keyboard-driven booking form:
    - Self-Booking vs Recipient toggle (with alternate on-scene phone).
    - Google Places address autocomplete for roadside breakdown location.
    - Vehicle Year, Make, Model, and Tire Size specification.
    - Complete 16-service multi-select catalog.
    - Urgency selector (`URGENT`, `STANDARD`, `FUTURE`) with ETA input.
    - Billing controls: base amount, tax checkbox toggle (`+ tax` or `- tax(box)`), payment method selector (`E-Transfer`, `POS`, `Cash`, `MOTO`).
    - Customer account auto-provisioning toggle (*"After all this make user account"*). Passwords hashed with Bcrypt.
  - 5-Disposition call logging (`Booked`, `RNC`, `WN`, `IR`, `Appointment Cancelled By CX`).
  - Public Landing Page booking widget (`/`):
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
  - Cash in Hand collection logger: Updates `DriverProfile.cashInHandCents` and creates `DriverCashLedger` entry.
  - In-app Dispatch Chat tab for immediate coordination with dispatchers.

---

## Phase 5: Accounting, Expense Stating & Financial Reconciliation
- **Objective:** Financial auditing, active job expense stating, margin calculations, and multi-currency reporting.
- **Deliverables:**
  - **Job Costing & Expense Stating Interface:**
    - Junior Accountant explicitly inputs/states the expenses for each completed job:
      - Material Fees (`materialCostCents` / `tireMaterialCostCents` - wholesale tires, parts, patches, valves).
      - Repairer Fees (`repairerFeeCents` / `driverPayoutCents` - driver/technician labor fee).
      - Other incidental expenses (`otherExpenseCents`) with explanatory notes.
    - Supplier parts receipt and customer invoice receipt upload/attachment handled by Multer.
  - **Payment Verification Audit:**
    - Dedicated boolean field `isPaymentVerified` with verifier identity and audit stamp.
    - Junior logs verification; Senior Accountant / Director audits stated expenses and finalizes payout approval.
  - **Automated Dynamic Net Margin Calculation:**
    $$\text{Total Job Expense} = \text{Material Fees} + \text{Repairer Fees} + \text{Other Expenses}$$
    $$\text{Net Profit} = \text{Customer Paid (CP)} - \text{Total Job Expense}$$
  - **IT Platform Royalty (`IT_B`) Ledger:**
    - Fixed fee deduction per job: **$1.50 CAD** / **$1.00 USD** / **£1.00 GBP**.
    - Displays Total Net of IT_B.
  - **Virtual Assistant Fleet Commission Settlement:**
    - Batch audit and payout interface for VA fleet commissions ($2–$3/job).
  - **Multi-Currency Period Reports:**
    - 4-Preset Date Filter: `Yesterday`, `Last 3 Days`, `One Week`, `Monthly Amount`.
    - Side-by-side currency summary cards for Canada (CAD), USA (USD), and UK (GBP).
