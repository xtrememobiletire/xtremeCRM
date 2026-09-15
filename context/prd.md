# Product Requirements Document (PRD) — XtremeCRM

## 1. Product Overview
XtremeCRM is an operations-focused Customer Relationship Management (CRM) and Dispatching platform purpose-built for mobile tire repair, seasonal tire changeovers, and emergency roadside automotive services operating in **Canada (CAD)**, the **United States (USD)**, and the **United Kingdom (GBP)**.

The software bridges the gap between high-pressure call-center intake, real-time fleet dispatching, mobile technician job execution, B2B fleet account management, and rigorous back-office financial reconciliation and expense accounting.

---

## 2. User Personas & Roles

| Persona | Role in System | Key Needs |
| :--- | :--- | :--- |
| **Call Center Agent** | Handles inbound phone calls, WhatsApp inquiries, and website bookings. | Active/Inactive presence toggle, Telnyx inbound screen pop with pre-filled caller number, instant customer/vehicle auto-lookup, Google address geocoding, 16-service picker, tax toggle, customer user account provisioning, call disposition logging. |
| **Dispatch Manager** | Assigns roadside jobs to drivers based on proximity and urgency; manages fleet accounts. | Urgent vs Standard queue with expandable accordion, arbitrary address distance measurement tool, single-click driver assignment, live status monitoring, driver messaging, driver cash-in-hand tracking, Fleets sidebar. |
| **Mobile Driver / Tech** | Roadside technician operating a mobile tire van. | Mobile-first UI with large tap targets, GPS navigation links, one-tap status updates (`EN_ROUTE`, `ARRIVED`, `COMPLETED`), Gross & Net earnings display, in-app dispatch messaging, cash collection ledger. |
| **Junior Accountant** | Audits completed tickets and states job expenses. | Explicitly states expenses for each completed job (material fees, repairer fees, other expenses), attaches supplier and customer receipts via Multer, logs initial payment verification check. |
| **Senior Accountant / Director** | Approves driver/repairer payouts, verifies payments, and monitors company P&L. | Verifies customer payment (`isPaymentVerified = true`), audits stated expenses, approves repairer payouts, monitors IT platform royalties (`IT_B`), runs multi-currency period reports. |
| **Virtual Assistant (VA)** | B2B cold calling & fleet lead acquisition. | ViciDial/BulkVS outreach, warm transfer to Dispatch Manager, automatic tracking of **$2–$3 commission per completed job** for acquired fleet accounts. |
| **Global Admin / Executive** | "Admin sees everything" — Omni-channel oversight. | Unrestricted cross-country visibility across Canada, USA, and UK; real-time operational queues, revenue, margins, and fleet performance. |
| **IT Team / Management** | Maintains infrastructure and collects per-job platform royalty. | Automated tracking of $1.50 CAD / $1.00 USD / £1.00 GBP fee per completed job and Total Net of IT_B. |

---

## 3. Functional Requirements

### 3.1. Inbound Call Intake & Multiple Agent Portal
- **FR-1.1: Agent Presence State:** Every agent has an `Active` and `Inactive` status toggle. When inactive, calls bypass the agent; when active, the agent receives incoming call events.
- **FR-1.2: Telnyx Inbound Screen Pop:** When an incoming call connects via Telnyx Webhook / WebRTC, an intake modal immediately pops open on an active agent's screen with the caller's phone number already populated.
- **FR-1.3: Customer Lookup & Auto-Link:** System queries customer database by phone number. If returning, past customer name, alternate numbers, vehicles, and tire sizes are populated instantly.
- **FR-1.4: Lead Channel Selector:** Intake form includes lead source dropdown: `1- Direct Call`, `2- Whatsapp`, `3- Website`.
- **FR-1.5: Recipient Handling:** Form supports `Self-Booking Or Recipient` toggle (capturing recipient name and phone if caller is booking on behalf of someone stranded).
- **FR-1.6: Breakdown Address Geocoding:** Address field integrates Google Maps Places Autocomplete and stores latitude/longitude coordinates (`serviceLat`, `serviceLng`).
- **FR-1.7: Vehicle & Tire Catalog:**
  - Vehicle Year, Make, Model capture.
  - Tire size entry formatted as standard specification (e.g. `235/45R18` with dropdown options for widths 235/245 and rims 17/18/19 inches).
- **FR-1.8: Complete 16-Service Roadside Catalog:**
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
- **FR-1.9: Urgency Tiers & Scheduling:**
  - `URGENT`: Emergency breakdown requiring immediate dispatch.
  - `STANDARD`: Same-day on-demand queue.
  - `FUTURE`: Scheduled appointment with date and time picker.
  - Manual `ETA` entered by agent or computed via Google Maps.
- **FR-1.10: Customer User Account Auto-Creation:**
  - *"After all this make user account"* — Upon booking, the system auto-provisions a customer account (`isUserAccountCreated = true`), allowing the stranded motorist to track their driver's live approach online via SMS link. Secure credential creation powered by Bcrypt.
- **FR-1.11: Billing & Tax Engine:**
  - Multi-currency pricing engine (e.g., CAD: `$160 + tax or - tax(box)` where 13% tax = `$20.80`, Total: `$180.80` / `$180`).
  - Dedicated checkbox toggle to apply or exempt tax (`+ tax` or `- tax(box)`).
  - Payment Methods: `1- E-Transfer`, `2- POS` (driver mobile card terminal), `3- Cash`, `4- MOTO` (telephone payment).
- **FR-1.12: Mandatory Outcome Tracking:** Every call handled by an agent must be tagged with a disposition:
  1. `1- Booked - Appointment Booked`
  2. `2- Relevant (Not converted) - RNC`
  3. `3- Business (Wrong Number) - WN`
  4. `4- Irrelevant (Another service) - IR`
  5. `5- Appointment Cancelled By CX`

### 3.2. Landing Page Public Booking Subsystem
- **FR-2.1: Public Booking Form:** Public self-booking widget hosted on the landing page (`/`). Customers can enter contact details, breakdown location, vehicle, tire size, and required service directly.
- **FR-2.2: Verification Queue:** Landing page submissions are validated via Zod and enter an unverified intake queue with status `PENDING` and `isVerified = false`.
- **FR-2.3: Outbound Agent Verification:** Call agents receive verification tasks to make an outbound call or SMS to confirm job details before dispatching a mobile technician.

### 3.3. Dispatch Manager Portal & Logistics
- **FR-3.1: Appointments Board & Queue Partitioning:** Dispatch dashboard organizes jobs into distinct views: Urgent, Standard, and Future Bookings.
- **FR-3.2: Urgent Queue Accordion:**
  - Urgent count badge (`How much and click and open`).
  - Expandable row accordion (`open the row`) allowing the dispatcher to immediately view customer notes, tire size, vehicle, and exact roadside GPS pin.
- **FR-3.3: Interactive Proximity & Arbitrary Address Distance Tool:**
  - *"add a address of any location and automatically measure the distance from the driver"*
  - Dedicated utility box allows typing any custom address to instantly measure driving distance and ETA from all active mobile technicians using Google Distance Matrix API with Haversine fallback.
- **FR-3.4: Driver Assignment:** Single-click dropdown to assign the nearest eligible mobile technician. Persists `driverId` and `assignedAt`.
- **FR-3.5: Driver Messaging:** Dedicated two-way chat channel between dispatcher and assigned driver per job ticket (`chat:job:{jobId}`).
- **FR-3.6: Driver Cash Tracking Section:** Dedicated ledger section tracking physical cash collected by drivers in the field (`cashInHandCents`).
- **FR-3.7: Fleets Sidebar Navigation:** Dedicated sidebar page `Fleets` for B2B fleet account onboarding and management.

### 3.4. B2B Fleets Sign-up Workflow
- **FR-4.1: Cold Outreach & Lead Ingestion:** ViciDial integrated with BulkVS used by Virtual Assistants (VAs) for commercial fleet outreach. Warm leads are transferred to Dispatch Manager.
- **FR-4.2: Fleet Profile Registration:** Dispatch Manager creates fleet profile via `[ + Add Fleet ]` capturing company details, fleet size, vehicle specs, and billing terms.
- **FR-4.3: Contract Execution & Verified Status:** Contract signed electronically $\rightarrow$ Fleet upgraded to **Verified B2B Partner**.
- **FR-4.4: Dedicated Fleet Service History:** Comprehensive service log tracking all roadside jobs, tire replacements, and vehicle maintenance per fleet account.
- **FR-4.5: Virtual Assistant Commission Ledger:**
  - The Virtual Assistant whose contact is linked to the fleet receives **$2–$3 for every completed job** performed for that fleet account.
  - Automatically logged in `FleetCommissionLedger` upon job completion.

### 3.5. Driver Mobile Execution (PWA / Mobile Web)
- **FR-5.1: Real-Time Job Push:** Assigned jobs push immediately to the driver’s mobile screen via Socket.io / SSE.
- **FR-5.2: State Progression:** Driver updates job state with large single-touch buttons:
  $$\text{ASSIGNED} \longrightarrow \text{EN\_ROUTE} \longrightarrow \text{ARRIVED} \longrightarrow \text{IN\_PROGRESS} \longrightarrow \text{COMPLETED}$$
- **FR-5.3: Gross & Net Earnings Display:** Driver mobile portal displays driver Gross and Net earnings for the completed job and shift pay-period.
- **FR-5.4: Cash Collection Ledger:** If payment method is *Cash*, driver records exact amount received. Updates driver's `cashInHandCents` balance.
- **FR-5.5: In-App Messaging:** Direct messaging tab to communicate with the dispatch manager.

### 3.6. Accountant Department & Job Expense Management
- **FR-6.1: Job Expense Stating & Itemization:**
  - The accountant actively **states and records the exact expense breakdown for each completed job ticket** (not merely verifying payments).
  - **Which job took how much expense:** Every job record receives explicit cost attribution:
    - **Repairer Fees:** Labor / technician fee stated by the accountant (`repairerFeeCents` / `driverPayoutCents`).
    - **Material Fees:** Parts and wholesale material cost stated by the accountant (`materialCostCents` / `tireMaterialCostCents`), covering new/used tires, rims, stem valves, plugs/patches, or battery units.
    - **Other Expenses:** Optional incidental expenses stated by the accountant (`otherExpenseCents`, e.g. disposal fees or road tolls).
    - **Expense Explanation Notes:** Accountant provides context for any atypical job expenses (`expenseNotes`).
  - Stored with audit attribution: `expenseStatedById` and `expenseStatedAt`.
- **FR-6.2: Payment Verification Workflow:**
  - Dedicated boolean verification flag: `isPaymentVerified` (default `false`).
  - Audits customer payment received (`CP`) against billed amount and verified payment method (POS settlement slip, Interac e-Transfer confirmation, or driver cash handover).
  - Persists verifier identity (`paymentVerifiedById`) and verification timestamp (`paymentVerifiedAt`).
- **FR-6.3: Net Profit Formula (Computed Dynamically):**
  $$\text{Total Job Expense} = \text{Material Fees (TC)} + \text{Repairer Fees (DC)} + \text{Other Expenses}$$
  $$\text{Net Profit} = \text{Customer Paid (CP)} - \text{Total Job Expense} = \text{CP} - \text{TC} - \text{DC}$$
  Derived dynamically in SQL / API queries; never stored as a duplicated column.
- **FR-6.4: Platform Royalty Fee (`IT_B`):**
  - System automatically registers a fixed platform deduction per completed job:
    - Canada: **$1.50 CAD**
    - USA: **$1.00 USD**
    - UK: **£1.00 GBP**
  - Dedicated accounting widget displaying regional fee balances and **Total Net of IT_B** ($\text{Net Profit} - \text{IT\_B}$).
- **FR-6.5: Two-Tier Audit Workflow & Multer Uploads:**
  - *Junior Accountant:* Audits completed tickets, states job expenses (material fees, repairer fees), uploads supplier material receipts and customer payment slips via Multer, and logs initial verification.
  - *Senior Accountant / Director:* Audits stated expenses against job tickets, verifies customer payment (`isPaymentVerified = true`), authorizes repairer payouts, and locks audited records.
- **FR-6.6: Time Period Reporting:**
  - Financial dashboard includes exact 1-click filter presets:
    - `Yesterday`, `Last 3 Days`, `One Week`, `Monthly Amount`.
  - Displays multi-currency cards for Canada (CAD), USA (USD), and UK (GBP) with Gross Paid, Material Fees, Repairer Fees, Net Profit, and Total Net of IT_B.

### 3.7. Global Admin Portal ("Admin sees every thing")
- **FR-7.1: Omni-Channel Executive Oversight:** Real-time visibility into all active calls, booking rates, dispatch queues, fleet accounts, driver cash balances, and company-wide financial P&L statements.
- **FR-7.2: Cross-Country Reporting:** Unrestricted filtering across Canada, USA, and UK without tenant barriers.

### 3.8. Real-Time Communication Layer
- **FR-8.1: Persistent Bidirectional Connection:** Socket.io / SSE event distribution synchronizing database mutations across Dispatch, Driver, Accountant, and Admin portals.
- **FR-8.2: Scoped Room Partitioning:** Dedicated rooms for regions (`dispatch:{region}`), drivers (`driver:{driverId}`), job chat (`chat:job:{jobId}`), and accounting (`accountant:{region}`).

---

## 4. Non-Functional Requirements
- **NFR-1: Low Latency & High Speed:** Express (Node.js + TypeScript) REST API response times $< 50\text{ms}$ for core booking endpoints. Zero UI lag during rapid keyboard typing.
- **NFR-2: Zero Data Duplication:** Strict database normalization per `data_models.md`. Net margins and total expenses derived dynamically.
- **NFR-3: Mobile Performance:** Driver PWA optimized for weak mobile cellular connections with auto-reconnecting Socket.io / SSE.
- **NFR-4: Financial Accuracy:** All money values stored in integer cents (`*_cents`). Floating-point money arithmetic is strictly prohibited.
- **NFR-5: Security & Role Isolation:** Helmet security headers, signed HttpOnly cookies via cookie-parser, Bcrypt password hashing, and Passport-JWT RBAC enforcement ensuring drivers cannot view company profit margins or other drivers' earnings; Junior Accountants cannot approve payouts without Senior review.
