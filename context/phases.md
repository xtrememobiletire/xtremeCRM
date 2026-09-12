# Implementation Phases — XtremeCRM

## Phase 1: Core Foundation & Infrastructure
- **Objective:** Establish monorepo structure, database models, authentication, and base UI layout.
- **Deliverables:**
  - Fastify server initialization with CORS, Cookie, JWT, and TypeBox validation plugins.
  - PostgreSQL database connection with Prisma ORM migrations (`schema.prisma`).
  - Seed script with Service Catalog (Tire repair, stem valves, swaps, battery, towing) and seed users (Admin, Agent, Dispatcher, Driver, Accountant).
  - React (Vite) frontend with Tailwind CSS (Red & White design tokens), Zustand store, and TanStack Query provider.
  - Role-based route protection for both API and frontend pages.

---

## Phase 2: Call Agent Intake & Disposition Module
- **Objective:** High-speed call booking modal and conversion tracking.
- **Deliverables:**
  - Phone number lookup API: Detects if returning customer; auto-populates past vehicles and tire sizes.
  - Fast keyboard-driven booking form:
    - Customer Info (Self-booking vs Recipient, Alt Phone).
    - Google Places address autocomplete for roadside breakdown location.
    - Vehicle Year, Make, Model, and Tire Size (`235/45R18`).
    - Service multi-select with dynamic subtotal and regional tax calculation (13% CAD / US local / 20% UK).
    - Urgency selector (`URGENT`, `STANDARD`, `FUTURE`) with ETA input.
    - Payment method selector (`E-Transfer`, `POS`, `Cash`, `MOTO`).
  - Disposition logging: `Booked`, `RNC`, `Wrong Number`, `Irrelevant`, `Cancelled by CX`.

---

## Phase 3: Dispatch Hub & Real-Time Socket.io Engine
- **Objective:** Centralized dispatch operations and driver assignment.
- **Deliverables:**
  - Socket.io integration on Fastify and React client.
  - Interactive Dispatch Board with tabbed queues:
    - **Urgent** (live flashing badge, sorted by arrival ETA).
    - **Standard** (on-demand queue).
    - **Future Bookings** (calendar/time-sorted appointments).
  - Driver Assignment Dropdown with live distance calculation (Driver GPS to Job address).
  - Real-time event propagation: When a driver accepts or updates status, all dispatchers' screens update instantly without full page refresh.

---

## Phase 4: Driver Mobile Execution View
- **Objective:** Mobile-optimized interface for van technicians in the field.
- **Deliverables:**
  - Mobile web/PWA layout with high-contrast red/white action buttons for outdoor visibility.
  - One-tap navigation link (`geo:` or Google Maps intent to breakdown address).
  - Status progression stepper:
    - `[ START DRIVING ]` $\rightarrow$ sets `EN_ROUTE`
    - `[ I HAVE ARRIVED ]` $\rightarrow$ sets `ARRIVED`
    - `[ WORK IN PROGRESS ]` $\rightarrow$ sets `IN_PROGRESS`
    - `[ COMPLETE JOB ]` $\rightarrow$ triggers payment collection modal.
  - Cash in Hand collection logger: Updates `DriverProfile.cashInHandCents` and creates `DriverCashLedger` entry.
  - Receipt upload / photo proof of work.

---

## Phase 5: Accounting & Reconciliation Audit Portal
- **Objective:** Financial auditing, margin calculations, and multi-currency reporting.
- **Deliverables:**
  - Job Costing Audit Table:
    - Junior Accountant audits material costs (Tire Cost `TC`), verifies payment receipt, and attaches slips.
    - Senior Accountant verifies and approves Driver Payout (`DC`).
  - Automated dynamic Net Margin calculation:
    $$\text{Net Margin} = \text{Customer Paid (CP)} - \text{Tire Cost (TC)} - \text{Driver Cost (DC)}$$
  - IT Platform Fee (`IT_B`) tracking:
    - Fixed fee deduction per job: **$1.50 CAD** / **$1.00 USD** / **£1.00 GBP**.
  - Multi-Currency Period Reports:
    - Filter presets: *Today, Yesterday, Last 3 Days, 1 Week, Monthly*.
    - Exportable Gross, Net, Material Cost, Driver Payouts, and IT_B balances.
