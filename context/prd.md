# Product Requirements Document (PRD) — XtremeCRM

## 1. Product Overview
XtremeCRM is an operations-focused Customer Relationship Management (CRM), Dispatching, and Fleet Invoicing platform purpose-built for mobile tire repair, seasonal tire changeovers, and emergency roadside automotive services operating in **Canada (CAD)**, the **United States (USD)**, and the **United Kingdom (GBP)**.

The software bridges the gap between high-pressure call-center intake, real-time fleet dispatching, mobile technician job execution, self-service B2B fleet and personal member portals, and rigorous back-office financial reconciliation and expense accounting.

---

## 2. User Personas & System Partitioning

### 2.1. Internal Company Staff (Operate inside `/admin`)
| Persona | Role in System | Key Needs |
| :--- | :--- | :--- |
| **Global Admin** | "Admin sees everything" — Full God-Mode oversight. | Unrestricted cross-country visibility across Canada, USA, and UK; full control to dispatch, edit invoices, state expenses, and view profit margins without bureaucratic internal blocks. |
| **Call Center Agent** | Handles customer inquiries, creates roadside service orders, and executes intake workflows. | Rapid intake form completion, customer/vehicle auto-lookup, Mapbox address autocomplete, 16-service picker, tax toggle, customer account auto-provisioning, call outcome disposition logging. Voice communications are conducted via the external partner dialer platform. |
| **Dispatch Manager** | Assigns roadside jobs to drivers based on proximity, traffic conditions, and urgency across retail and fleet queues. | Dedicated views for `/jobs`, `/fleet-jobs`, and `/bookings`; Mapbox single-view proximity and ETA estimation; driver assignment dropdown; driver cash-in-hand tracking. |
| **Accountant** | Audits completed tickets, states job expenses, verifies payments, and manages regional P&L. | States expenses per completed job (wholesale material costs, technician repairer fees, other incidentals), verifies customer payment, audits receipts via Multer, approves repairer payouts, and monitors regional P&L ledgers (CAD, USD, GBP strictly separated). |
| **Virtual Assistant (VA)** | B2B fleet lead acquisition and outbound callback execution. | Imports fleet prospect CSV files via `/va-upload`; manages callbacks and lead dispositions on the dedicated `/outbound` call queue; tracks $2–$3 commission per completed job for converted fleets via `FleetCommissionLedger`. Telephony is handled via external partner dialer delegation. |

> [!NOTE]
> **WhatsApp:** There is currently no WhatsApp Business API integration. `WHATSAPP` exists only as a manual lead source tag — the owner handles WhatsApp conversations outside the CRM, and agents select `WHATSAPP` as the source when creating jobs from those conversations. A full WhatsApp Business API integration (automated message ingestion, template messaging, 24-hour session management) may be added in a future phase.

### 2.2. External Customer Accounts (NOT Company Staff — Sandboxed Client Portals)
| Persona | Access Portal | Key Needs |
| :--- | :--- | :--- |
| **Fleet Manager (B2B)** | `/fleet-dashboard` | Manage 18+ registered fleet vehicles with license plates (e.g. `KT-15`, `KT-18`) and tire sizes (`11R22.5`); manage driver directory ("My Drivers"); book scheduled maintenance or emergency roadside requests; monitor live service status; receive internal company messages & notifications; view **Pending Invoices** and **Paid Invoices**; download professional PDF invoices. |
| **Personal Member (B2C)** | `/member-dashboard` | Store personal vehicles and tire specs; book priority roadside assistance with member discounts; track live technician approach; view past job history and payment receipts. |

---

## 3. Functional Requirements

### 3.1. Inbound Intake & External Dialer Integration Module
- **FR-1.1: Telephony Scope, Partner Dialer Delegation & Telnyx Code Preservation:**
  - All active inbound voice routing, automated call distribution (ACD), call queues, softphone media streams, and outbound dialing engines currently operate through the external partner dialer platform.
  - **Code Preservation Architecture:** The existing Telnyx WebRTC softphone implementation, SIP token minting services, and telephony controllers (`telnyxService.ts`, `telephonyController.ts`, `IncomingCallPop.tsx`, `ActiveCallBar.tsx`) are **fully preserved and retained** in the codebase under a modular feature flag (`ENABLE_TELNYX_SOFTPHONE=false`) for seamless future Telnyx re-integration.
  - For current routine operations, active audio stream controls are bypassed so the CRM client prioritizes high-velocity CRUD operations for job lifecycles, account management, dispatch optimization, fleet operations, and VA outbound callback queues without runtime telephony overhead.
- **FR-1.2: Rapid Call Intake & Screen Pop Integration:**
  - When a call connects on the external dialer, the agent opens or switches to the CRM Intake Modal (`/jobs/new` or global hotkey `Ctrl+Space`).
  - Where supported by dialer integration hooks (URL parameters or webhook ingress), the caller phone number (`phone`) is automatically populated in the intake form.
  - **Caller Profile Detection:** Instant background search (`GET /api/customers/lookup?phone=...`):
    - *Returning Customer / Fleet:* Displays `[✓ RETURNING CUSTOMER / FLEET]` card with pre-saved vehicles, tire sizes, and fleet billing terms for 1-click selection.
    - *First-Time Motorist:* Displays `[✦ NEW CALLER / FIRST-TIME MOTORIST]` badge, detects region from area code, provides blank onboarding form with pre-checked `[x] Create Customer Account & Send SMS Tracking Link`.
- **FR-1.3: Data Division: Auto-Populated vs. Agent-Entered Intake Details:**
  - **A. Auto-Populated by System:** Caller phone number, lead source tag (`DIRECT_CALL`, `WEBSITE`, `FLEET_PORTAL`), call timestamp, and existing account/fleet records.
  - **B. Agent-Entered Operational Details:**
    1. *Roadside Breakdown Address (`serviceAddress`):* Entered via Mapbox Address Autocomplete (resolving street, city, state/province, postal code, and latitude/longitude coordinates).
    2. *Recipient Confirmation (`isRecipient`):* On-scene driver name and mobile number if calling on behalf of third party.
    3. *Vehicle & Tire Specification:* Make, Model, Year, and exact tire size (`tireSize`, e.g. `235/45R18` or commercial `11R22.5`).
    4. *Service Selection:* Chosen from standard 16-service roadside catalog.
    5. *Urgency Level & Agreed ETA:* `URGENT`, `STANDARD`, or `FUTURE` appointment with agreed verbal arrival window.
    6. *Billing & Tax Controls:* Quoted subtotal, tax exemption toggle (`+ tax` / `- tax`), payment method (`E-Transfer`, `POS`, `Cash`, `MOTO`).
    7. *Problem Notes:* Freeform roadside instructions (shoulder location, wheel lock key location).
    8. *Mandatory Outcome Disposition:* `Booked - Appointment Booked`, `Relevant (Not converted) - RNC`, `Business (Wrong Number) - WN`, `Irrelevant (Another service) - IR`, `Appointment Cancelled By CX`.
- **FR-1.4: Complete 16-Service Roadside Catalog:**
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

### 3.2. 24/7 Fleet Driver Roadside Call-In Workflow
- **FR-2.1: Direct Driver Roadside Verification:**
  - Commercial truck/van drivers call dispatch directly from the road (bypassing fleet managers at 2:00 AM).
  - Driver provides **License Plate Number** (e.g. `KT-15`) or **Company Name** (e.g. "KT Group").
  - Dispatcher searches plate/company $\rightarrow$ CRM immediately displays:
    1. Active verified fleet account (`Approved` badge, `XMT-5132`).
    2. Vehicle make/model and **pre-registered tire size** (`11R22.5`).
    3. Authorized billing terms.
  - Technician is dispatched immediately with the exact tire on board without phone tag.

### 3.3. External Fleet Manager Portal (`/fleet-dashboard`)
- **FR-3.1: 7 Core Navigation Views:**
  1. **Dashboard:** KPI cards (Total Vehicles, Total Drivers, Company profile with internal email `piratheep@xtrememobiletire.com`, address, phone, website).
  2. **Vehicles Directory:** Card/grid view of all registered fleet trucks/vans with Make/Model, Year, License Plate (`KT-15`, `KT-18`), and delete action.
  3. **My Drivers Directory:** Registered driver names and mobile numbers for fast dispatch identification.
  4. **Request New Service (Appointment Booking):** Form capturing Date & Time (24/7 Hours), Vehicle dropdown, Service dropdown, Service Type ("Standard Service" vs "Roadside Emergency"), Phone, Tire Size, and Address.
  5. **Service Status:** Real-time tracking board showing Appt #, Service Name, Service Type, Vehicle, Tire Size, Address, Date/Time, and Status badge (`Job Start`, `En Route`, `In Progress`, `Completed`).
  6. **Pending Invoices:** Unpaid or outstanding invoices awaiting payment.
  7. **Paid Invoices:** Historical settled invoices with receipt downloads.
- **FR-3.2: Internal Portal Inbox:**
  - Fleet clients receive notices, service status updates, and invoice links directly inside their dashboard via `PortalMessage` (eliminating external Gmail/Google Workspace dependency).

### 3.4. Job Classification, Route Segmentation & Mapbox Dispatch
- **FR-4.1: Specialized UI Route Segmentation:**
  To maximize operational velocity and eliminate clutter, dispatch views are strictly partitioned across three dedicated routes:
  1. **Standard Jobs (`/jobs`):**
     - Manages individual retail customers, walk-in motorists, and direct call-in requests.
     - Enforces standard retail rate cards, manual driver assignment, and standard payment workflows.
  2. **Fleet Jobs (`/fleet-jobs`):**
     - Encapsulates contracted corporate fleet accounts and recurring commercial clients.
     - Enforces contracted fleet pricing matrixes, corporate SLA countdown timers, and driver eligibility filters (clearances/certifications).
  3. **Bookings Triage (`/bookings`):**
     - Staging zone for unverified public web submissions, isolating them from active operational dispatch grids.
- **FR-4.2: Mapbox Proximity Engine & Single-View Dispatch ETA:**
  - **No Continuous GPS Drain:** The system does NOT run continuous background GPS tracking loops.
  - **Single-View Evaluation:** When a dispatcher opens a job to assign a driver, the proximity engine performs an instantaneous snapshot calculation:
    1. *Geocoded Job Location:* Latitude/longitude resolved via Mapbox Geocoding API.
    2. *Driver Coordinates Snapshot:* Latest recorded GPS coordinates of active, clocked-in drivers (`User.lastLatitude`, `User.lastLongitude`).
    3. *Matrix API Travel Calculation:* Computes driving distance and estimated transit time using the Mapbox Matrix API.
    4. *Traffic Snapshot:* Queries Mapbox Directions API with live traffic congestion layers to establish realistic ETA.
    5. *Operational Filters:* Evaluates driver readiness, current job status (e.g. idle vs. concluding current ticket), shift limits, and vehicle capability/tooling.
  - **Dynamic Driver Ranking:** Drivers are dynamically sorted by travel duration. Dispatcher assigns with 1 click, pushing job assignment events across the real-time SSE event stream.
- **FR-4.3: Driver Messaging & Cash Accountability:**
  - Dedicated two-way chat channel between dispatcher and assigned driver per job ticket (`JobMessage`).
  - Dedicated ledger section tracking physical cash collected by drivers in the field (`cashInHandCents`).

### 3.5. Invoicing & Commercial Financial Engine
- **FR-5.1: Separation of Invoices from Jobs:**
  - Jobs track operational fulfillment (van routing, roadside arrival, job status).
  - Invoices represent the commercial billing instrument sent to clients.
- **FR-5.2: Custom Creator Numbering Scheme:**
  - Every invoice number follows the structure: **`[CreatorInitials]-[CountryCode]-[SequentialDigits]`**.
  - Example: `MW-US-0002` (created by Mike William in US), `AG-CA-0105` (created by Call Agent in Canada).
- **FR-5.3: Flexible Due Date:**
  - Invoices support customizable due dates (e.g. Due Upon Receipt, 1-day turnaround, Net 15, Net 30).
- **FR-5.4: 1-Click Generation from Completed Jobs:**
  - Clicking "Generate Invoice" on a completed job auto-populates client contact, company name, vehicle details (`INTL 40 S 2000 White`), line items, prices, and tax.
- **FR-5.5: Multi-Job Weekly Fleet Consolidation:**
  - Fleets (like KT Group) receive consolidated weekly invoices bundling all roadside calls and maintenance performed during the billing cycle into a single itemized statement.
- **FR-5.6: Professional PDF Export Engine:**
  - Generates print/download PDFs matching the verified client invoice layout:
    - Red & Black **XTREME MOBILE TIRE** header.
    - Invoice Number, Issue Date, Due Date.
    - Client block (Contact, Company, Phone, Address, Vehicle).
    - Provider block (Regional Warehouse Hub in Manassas, VA or Mississauga, ON).
    - Itemized line items table (Details, Unit Price, Qty, Total).
    - Subtotal, Net Total, Tax, Grand Total.
    - Payment instructions: E-transfer / bank transfer to `Payments@xtrememobiletire.com` and assigned tracking code.

### 3.6. Accountant Department & Job Expense Stating (Zero Inventory)
- **FR-6.1: Active Job Costing (Zero Stock Overhead):**
  - No complex warehouse inventory or stock counts.
  - The accountant directly inputs actual job expenses for every completed ticket:
    - **Material Cost ($TC$):** Wholesale tire, rim, valve, or part cost.
    - **Repairer Fee ($DC$):** Technician labor compensation.
    - **Other Expenses:** Incidental costs with explanatory notes.
- **FR-6.2: Payment Verification Workflow:**
  - Payment verification is derived dynamically on read (`paymentVerifiedById != null || paymentStatus == VERIFIED_PAID`), capturing verifier identity and audit timestamp.
- **FR-6.3: Net Profit Dynamic Calculation:**
  $$\text{Total Job Expense} = TC + DC + \text{Other Expenses}$$
  $$\text{Net Profit} = \text{Customer Paid (CP)} - \text{Total Job Expense}$$
  $$\text{Net After IT\_B} = \text{Net Profit} - \text{IT\_B}$$
- **FR-6.4: Platform Royalty Fee (`IT_B`):**
  - Deducted per completed job: Canada: **$1.50 CAD** (150 cents), USA: **$1.00 USD** (100 cents), UK: **£1.00 GBP** (100 pence).
- **FR-6.5: Receipt Attachments via Multer:** Customer payment proof (`receiptUrl`) and wholesale supplier invoice (`materialReceiptUrl`).
- **FR-6.6: Senior vs. Junior Accountant Permission Tiers (Zero Enum Bloat):**
  - Uses capability boolean `canApprovePayouts` on user record instead of adding database roles.
  - **Junior Accountant (`canApprovePayouts = false`):** Audits completed roadside tickets, inputs wholesale parts cost ($TC$), technician labor payout ($DC$), incidentals, and uploads supplier invoices (`materialReceiptUrl`). Payout release button is disabled.
  - **Senior Accountant (`canApprovePayouts = true` / `ADMIN`):** Verifies customer remittance, reconciles driver physical cash envelopes, approves repairer payouts, and locks financial ledgers against further modification.
- **FR-6.7: Exact Accounting Quick Date Filter Presets:**
  - Reconciliation dashboard provides 4 1-click date filters:
    1. **Yesterday:** Previous 24h operational window.
    2. **Last 3 Days:** Rolling 72h window for weekend backlog reconciliation.
    3. **1 Week / 7 Days:** Weekly dispatch cycle for consolidated fleet billing.
    4. **Monthly Amount:** Full calendar month-to-date regional P&L ledger.
- **FR-6.8: IT Platform Royalties Dashboard (`IT_B`):**
  - Dedicated admin page displaying accumulated platform developer royalties across all completed jobs.
  - Breakdown by country/currency (CAD, USD, GBP — never blended or cross-currency).
  - Same quick date filter presets as accounting (Yesterday, 3 Days, 1 Week, Monthly).
  - Visible to `ADMIN` role only (platform developers operate under `ADMIN` accounts — no separate `DEVELOPER` role).

### 3.7. Regional Territorial Hubs
- **FR-7.1: US Regional Hub:** 11815 Medway Church Loop, Manassas, VA 20109 | (804) 326-5442 (Covers VA, MD, DC, KY, NC, TN in USD).
- **FR-7.2: Canada Regional Hub:** 857 Winterton Way, Mississauga, ON L5V 1Z5 | (437) 375-5674 (Covers ON, GTA in CAD).

### 3.8. Web Booking Verification Pipeline (`/bookings`)
- **FR-8.1: Three-Stage Triage Workflow:**
  All self-service bookings submitted via public web forms or landing page widgets must navigate a mandatory 3-stage verification lifecycle before entering active dispatch:
  1. **Stage 1: Ingress (`/bookings` Staging Table):**
     - Web submissions enter via API (`POST /api/bookings`) and are persisted in status `UNVERIFIED_PUBLIC`.
     - Staged bookings are assigned a triage timestamp and trigger an auditory chime and SSE notification on dispatcher consoles.
     - Bookings in `/bookings` are strictly segregated and do NOT appear on `/jobs` or `/fleet-jobs` active grids.
  2. **Stage 2: Dispatcher Verification Review:**
     - Dispatcher reviews staged submission within the verification side-panel:
       - Validates customer contact details and phone number.
       - Validates breakdown address geocoding and physical accessibility via Mapbox.
       - Validates requested services and tire sizing against company inventory/tooling capacity.
       - Confirms account classification (Retail Standard vs. Contracted Fleet).
     - Dispatcher can initiate callback to customer to confirm details.
     - If fraudulent or non-viable, dispatcher rejects the booking with disposition `SPAM`, `DUPLICATE`, or `UNREACHABLE`.
  3. **Stage 3: Transition to Active Dispatch:**
     - Upon successful verification, dispatcher clicks **[ Approve & Convert ]**.
     - System updates status to `PENDING` and routes the job to its appropriate operational surface:
       - Retails $\rightarrow$ Elevated to `/jobs` active dispatch grid.
       - Corporate Fleet $\rightarrow$ Elevated to `/fleet-jobs` with SLA timers active.
     - Record is instantly broadcast over the SSE stream to active dispatchers for driver assignment.

### 3.9. Virtual Assistant Outbound Queue & Prospect Campaigns
- **FR-9.1: Dedicated VA Workspace Pages:**
  The Virtual Assistant workflow operates across two dedicated views:
  1. **Upload Interface (`/va-upload`):** Processing and validation of bulk CSV fleet lead files. Auto-tags leads with the uploader's `uploadedByVaId` via JWT session.
  2. **Outbound Call Queue (`/outbound`):** Designed similarly to the unassigned jobs dispatch board. Displays assigned prospect leads, scheduled callbacks, and lead history.
- **FR-9.2: Outbound Workflow & External Dialer Execution:**
  - VA agents work through their outbound queue during routine shifts.
  - Phone calls are initiated via the external partner dialer interface.
  - After engaging the prospect, the VA immediately records the call disposition in CRM: `CALLBACK`, `CONVERTED`, `NOT_INTERESTED`, `WRONG_NUMBER`, `NO_ANSWER`, `VOICEMAIL`, `RNC`.
- **FR-9.3: Callback Management:**
  - When set to `CALLBACK`, VA specifies callback datetime and notes.
  - At the designated time, the callback surfaces with high priority at the top of the `/outbound` queue.
- **FR-9.4: Fleet Conversion & Commission Tracking:**
  - Interested prospects are flagged as `CONVERTED`.
  - When an Admin/Manager approves and creates the corporate fleet account, `Fleet.virtualAssistantId` is linked.
  - Every subsequent completed job for this fleet generates an immutable $2–$3 commission in `FleetCommissionLedger`.

---

## 4. Non-Functional Requirements
- **NFR-1: Performance & Zero Lag:** Express (Node.js + TypeScript) REST API response times $< 50\text{ms}$. Instant search on license plates and phone numbers.
- **NFR-2: Zero Data Duplication:** Strict database normalization per `data_models.md`. Tire size stored once on `Vehicle`; financial margins derived dynamically on read.
- **NFR-3: Exact Financial Integrity & Strict Regional Silos:** All monetary amounts are stored internally as whole integer cents / pence (`*_cents`) to completely eliminate binary floating-point rounding bugs (`0.1 + 0.2 != 0.3`). The UI always renders standard human-readable currency strings (e.g. `$160.00 CAD`, `$160.00 USD`, `£45.50 GBP`). Each country (Canada, US, UK) operates as a completely separate silo with its own pricing, tax rules, and currency. Blended or cross-currency totals are strictly forbidden — no mixed revenue numbers exist.
- **NFR-4: Security & Sandboxing (Client & Driver Financial Isolation):**
  - External clients (`FLEET_MANAGER`, `CUSTOMER_MEMBER`) are strictly sandboxed to their own vehicles, drivers, and invoices.
  - Mobile drivers (`DRIVER` role) are strictly isolated: driver consoles render ONLY driver personal earnings ($DC$), completed job counts, and physical cash collected in hand (`cashInHandCents`).
  - Wholesale material cost ($TC$), IT platform royalties ($IT\_B$), and company net profit margins are 100% hidden and omitted from driver payloads and mobile views.
- **NFR-5: Real-Time Communication via Server-Sent Events (SSE):**
  - All real-time server-to-client notifications and state updates must be delivered via Server-Sent Events (`text/event-stream`).
  - Backend must maintain a persistent, unidirectional event stream partitioned by regional `countryCode`.
  - Frontend must connect via native `EventSource` with automated exponential backoff reconnection.
- **NFR-6: Strict In-Memory Caching & Anti-Pattern Prohibition:**
  - Storing server data or query cache in browser `sessionStorage` or `localStorage` is **strictly forbidden**.
  - All server state must be held strictly in-memory by TanStack Query v5; all client UI state must be managed via Zustand.
  - Cache invalidation and updates must occur via memory-based `queryClient.invalidateQueries` triggered by SSE payloads.

