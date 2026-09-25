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
| **Call Center Agent** | Handles inbound phone calls and website bookings; qualifies outbound B2B fleet leads (Phase 2). | Tri-state mode toggle (`INACTIVE` / `INBOUND` / `OUTBOUND` — one active at a time), Telnyx inbound screen pop with pre-filled caller number, instant customer/vehicle auto-lookup, Google address geocoding, 16-service picker, tax toggle, customer user account provisioning, call disposition logging, Telnyx warm transfer to Dispatch Manager / Admin for fleet contract close. |
| **Dispatch Manager** | Assigns roadside jobs to drivers based on proximity and urgency; manages fleet accounts. | Urgent vs Standard queue with expandable accordion, arbitrary address distance measurement tool, single-click driver assignment, live status monitoring, driver messaging, driver cash-in-hand tracking, Fleets directory. |
| **Accountant** | Audits completed tickets, states job expenses, verifies payments, and manages regional P&L. | States expenses per completed job (wholesale material costs, technician repairer fees, other incidentals), verifies customer payment, audits receipts via Multer, approves repairer payouts, and monitors regional P&L ledgers (CAD, USD, GBP strictly separated). |
| **Virtual Assistant (VA)** | B2B fleet lead acquisition & cold-call data sourcing. | Imports fleet prospect data via CSV/Excel upload into CRM (auto-tagged to VA via JWT), system round-robin assigns leads to call agents, warm transfer of interested prospects to Dispatch Manager / Admin via Telnyx attended transfer, automatic tracking of **$2–$3 commission per completed job** for acquired fleet accounts via `FleetCommissionLedger`. |

> [!NOTE]
> **WhatsApp:** There is currently no WhatsApp Business API integration. `WHATSAPP` exists only as a manual lead source tag — the owner handles WhatsApp conversations outside the CRM, and agents select `WHATSAPP` as the source when creating jobs from those conversations. A full WhatsApp Business API integration (automated message ingestion, template messaging, 24-hour session management) may be added in a future phase.

### 2.2. External Customer Accounts (NOT Company Staff — Sandboxed Client Portals)
| Persona | Access Portal | Key Needs |
| :--- | :--- | :--- |
| **Fleet Manager (B2B)** | `/fleet-dashboard` | Manage 18+ registered fleet vehicles with license plates (e.g. `KT-15`, `KT-18`) and tire sizes (`11R22.5`); manage driver directory ("My Drivers"); book scheduled maintenance or emergency roadside requests; monitor live service status; receive internal company messages & notifications; view **Pending Invoices** and **Paid Invoices**; download professional PDF invoices. |
| **Personal Member (B2C)** | `/member-dashboard` | Store personal vehicles and tire specs; book priority roadside assistance with member discounts; track live technician approach; view past job history and payment receipts. |

---

## 3. Functional Requirements

### 3.1. Inbound Call Intake & Telnyx WebRTC Softphone Module
- **FR-1.1: Agent Presence & Mode State:** Every agent has a tri-state mode toggle in the CRM top navigation: `INACTIVE` / `INBOUND` / `OUTBOUND` (only one active at a time, hard lock). `INACTIVE` agents receive zero call routing and see no outbound queue. `INBOUND` agents automatically receive incoming calls and screen pops. `OUTBOUND` agents are invisible to inbound call routing and instead see their assigned outbound lead queue (Phase 2).
- **FR-1.2: Embedded Telnyx WebRTC Softphone & Dual-Trigger Screen Pop:**
  - **In-Browser Digital Phone:** Embedded `@telnyx/webrtc` client connected via short-lived JWTs minted by the backend (`GET /api/telephony/token`).
  - **Single-Click Answering:** When a call arrives, the agent hears the ringtone directly through their headset and can answer with 1 click (`[ Answer Call ]` or Spacebar) inside the CRM tab.
  - **Dual-Trigger Screen Pop:** Incoming calls trigger an immediate modal popup simultaneously via the browser WebRTC `ringing` event and the backend Telnyx webhook (`POST /api/telephony/webhook` over Socket.io) ensuring zero lag even under high network latency.
  - **Click-to-Call Outbound:** Agents and dispatchers can click any phone number in tickets, customer profiles, or driver cards to initiate immediate outbound calling through the browser headset.
  - **Attended (Warm) Transfer:** Agent can place the current call on hold, internally call a Dispatch Manager or Admin to brief them, then bridge the prospect into the conversation or drop off. Used for fleet contract qualification handoffs (Phase 2 outbound) and inbound escalations. Implemented via Telnyx Call Control API (`/v2/calls/{call_leg_id}/actions/transfer`).
- **FR-1.3: Data Division: Auto-Populated vs. Agent-Entered Intake Details:**
  To maximize operational speed while ensuring accurate roadside dispatching, the intake form explicitly partitions data between automated system ingestion and live agent conversation entry:
  
  **A. Auto-Populated by System (Zero Manual Typing on Ring):**
  1. *Caller Phone Number (`phone`):* Automatically extracted from Telnyx caller ID (`caller_id_number`) and locked into the primary phone input.
  2. *Default Lead Source (`source`):* Defaults automatically to `DIRECT_CALL`. Agent can manually override to `WHATSAPP` (owner handles WhatsApp conversations manually — no WhatsApp Business API), `WEBSITE`, `LANDING_PAGE_SELF_BOOK`, `FLEET_PORTAL`, or `MEMBER_PORTAL` based on how the customer reached the company.
  3. *Call Timestamp & Unique Call ID:* System auto-generates call ticket ID and timestamps entry.
  4. *Caller Profile Detection (Returning vs. Non-User / First-Time Caller):*
     - The system executes an instant background lookup (`GET /api/customers/lookup?phone=...`):
     - **If Returning Customer / Fleet Account:**
       - Displays `[✓ RETURNING CUSTOMER / FLEET]` badge.
       - Customer name, email, secondary phone, fleet affiliation (e.g. `KT Group / XMT-5132`), and saved vehicles are displayed in an active 1-click selection card.
     - **If Non-User / First-Time Caller (No DB Record Found):**
       - Displays prominent `[✦ NEW CALLER / FIRST-TIME MOTORIST]` badge.
       - Displays detected regional location from area code (e.g. *"Area Code (416) — Ontario, CA"*).
       - Opens a clean, blank **Rapid Onboarding & Roadside Booking Form** with caller phone pre-filled.
       - Pre-checks `[x] "After all this make user account"` by default, automatically provisioning their customer profile, saving their vehicle & tire size, and sending an SMS tracking link upon booking confirmation.
       - Provides 1-click **`[ Link to B2B Fleet ]`** search bar in case the caller is an unregistered driver driving for a contracted fleet account (e.g. KT Group truck `KT-15`).
       - Provides 1-click **Quick Disposition Shortcuts** (`[ Wrong Number ]`, `[ Price Shopper / RNC ]`, `[ Irrelevant / Spam ]`) allowing the agent to dismiss non-booking calls in 1 keystroke without filling any form fields.
  
  **B. Agent-Entered Operational Details (Collected Live During Call):**
  1. *Roadside Breakdown Address (`serviceAddress`):* The agent asks where the motorist is stranded and types into the Google Places Autocomplete input (capturing highway, cross streets, shoulder position, and geocoded GPS coordinates). *Roadside breakdown location is independent of any saved customer profile address.*
  2. *Recipient Confirmation (`isRecipient`):* Agent confirms if caller is the driver or booking on behalf of another party (captures on-scene contact name and phone).
  3. *Vehicle & Tire Specification:*
     - If returning vehicle: Agent clicks to select the matching vehicle.
     - If new vehicle: Agent selects Year, Make, Model, and records exact tire size (`tireSize`, e.g. `235/45R18` or commercial truck `11R22.5`).
  4. *Service Selection (16-Service Catalog):* Agent selects required service(s) from the 16-service catalog (e.g. Tire Plug, New Tire, Valve Stem, Jump Start, Towing).
  5. *Urgency Level & Agreed ETA:*
     - Agent confirms priority: `URGENT` (immediate roadside dispatch), `STANDARD` (same-day), or `FUTURE` (scheduled appointment).
     - Agent enters agreed verbal ETA (`etaMinutes`).
  6. *Billing & Tax Controls:*
     - Base price quote confirmation.
     - Regional sales tax checkbox toggle (`+ tax` or `- tax(box)`).
     - Payment method selector: `E-Transfer`, `POS` (mobile card machine), `Cash`, `MOTO` (phone credit card).
  7. *Customer Account Provisioning Toggle:* Agent checks *"After all this make user account"* to auto-provision customer login credentials for live SMS approach tracking.
  8. *Specific Roadside Problem Notes:* Freeform notes (e.g. *"Front right flat on highway shoulder, locking lug nut socket located in glovebox"*).
  9. *Mandatory Call Outcome Disposition:* Every incoming call MUST be classified before closing:
     `Booked - Appointment Booked`, `Relevant (Not converted) - RNC`, `Business (Wrong Number) - WN`, `Irrelevant (Another service) - IR`, `Appointment Cancelled By CX`.
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

### 3.4. Dispatch Manager Portal & Logistics
- **FR-4.1: Appointments Board & Queue Partitioning:** Dispatch dashboard organizes jobs into distinct views: Urgent, Standard, and Future Bookings.
- **FR-4.2: Urgent Queue Accordion:** Urgent count badge with expandable row accordion allowing the dispatcher to immediately view customer notes, tire size, vehicle, and exact roadside GPS pin.
- **FR-4.3: Interactive Proximity & Distance Tool:** Utility box allowing typing any custom address to instantly measure driving distance and ETA from all active mobile technicians.
- **FR-4.4: Single-Click Driver Assignment:** Dropdown to assign the nearest eligible mobile technician with real-time Socket.io push.
- **FR-4.5: Driver Messaging:** Dedicated two-way chat channel between dispatcher and assigned driver per job ticket.
- **FR-4.6: Driver Cash Tracking Section:** Dedicated ledger section tracking physical cash collected by drivers in the field (`cashInHandCents`).

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

### 3.8. Landing Page Self-Booking Outbound Lead Triage Queue
- **FR-8.1: Public Web Intake Pipeline:**
  - Self-service bookings submitted via landing page widget enter a dedicated triage queue in status `UNVERIFIED_PUBLIC`.
  - Inbound submissions auto-poll every 5 seconds with auditory chime.
  - Agents verify customer location, OEM tire size compatibility, and payment method via embedded Telnyx softphone click-to-call before clicking `[ PROMOTE TO URGENT DISPATCH ]`.
  - Non-responsive or invalid submissions are dismissed with dispositions `UNREACHABLE` or `SPAM`.

### 3.9. Outbound Lead Management & B2B Fleet Acquisition Module (Phase 2)
> **Build Priority:** Inbound operations (Sections 3.1–3.8) are built first. This section documents the outbound workflow to reserve architectural space — schema, enums, and API surface — without blocking Phase 1 delivery.

- **FR-9.1: Virtual Assistant CSV/Excel Lead Import:**
  - VAs upload CSV/Excel files containing fleet prospect data via the admin portal (`POST /api/leads/import`).
  - **Required CSV Columns:** Company Name, Company Address, Website, Fleet Manager Name, CEO/Owner Name, Contact Number, Alternative Contact Number, Official Email, Decision Maker Email, Number of Units (NOU — total fleet vehicle count).
  - System auto-tags every imported lead row with the uploading VA's identity (`uploadedByVaId`) from JWT authentication — no manual "uploaded by" column required in the CSV.
  - **Duplicate Detection on Import:** On upload, system checks each row's `contactNumber` and `companyName` against existing leads. Matching records are imported but flagged as `POSSIBLE_DUPLICATE` with a reference to the original VA who uploaded the matching record. No silent drops, no hard blocks — VA or manager decides to merge, skip, or keep both.

- **FR-9.2: Admin-Controlled Campaign Batch Start & 5-Cap Auto-Replenishment:**
  - Upon CSV/Excel import by VA, all leads sit in the **unassigned pool** (`assignedAgentId: null`, `status: NEW`). No leads are distributed at import time.
  - An **Admin** initiates the outbound campaign by clicking **[ Start Batch ]** on the admin panel. This action:
    1. Queries all agents currently in `OUTBOUND` mode (active agents only).
    2. Assigns **5 leads** from the unassigned pool to each active agent (FIFO order — oldest uploaded first).
    3. Each lead record stores `assignedAgentId` referencing the assigned agent.
  - **Auto-Replenishment (5-Cap Rule):** After every completed call disposition, the system immediately checks: if the agent's active lead count is `< 5`, it pulls `5 - K` leads from the unassigned pool and assigns them to that agent — keeping the agent at exactly **5 active leads** at all times until the batch pool is exhausted.
  - **Anti-Bottleneck Design:** Performing agents who complete dispositions quickly receive fresh leads immediately. Underperforming agents who take longer do not bottleneck faster agents — each agent's queue refills independently based on their own pace.
  - Admins can manually reassign leads between agents at any time via the leads panel.

- **FR-9.3: Agent Outbound Mode & Auto-Dial Workflow:**
  - **Same agent pool** handles both inbound and outbound work — there are no separate inbound-only or outbound-only agents. The **existing tri-state mode toggle** (FR-1.1: `INACTIVE` / `INBOUND` / `OUTBOUND`) determines what an agent is doing at any given moment. Simultaneous inbound + outbound is not possible — agents switch modes via the toggle.
  - When an agent switches to `OUTBOUND` mode, the system displays their assigned lead queue sorted by: **scheduled callbacks first** (by callback datetime), then oldest unworked leads.
  - **Auto-Dialer:** The system **automatically dials** the lead's contact number via Telnyx WebRTC as soon as the agent enters `OUTBOUND` mode or after each disposition is saved. The agent does not need to click a call button — the next lead is dialed automatically.
  - After each call, the agent **must** set a disposition and optional notes before the system auto-dials the next lead.

- **FR-9.4: Outbound Call Dispositions:**
  - `CALLBACK` — Prospect requested callback (agent sets callback date, day, and time).
  - `CONVERTED` — Prospect interested; warm-transferred to Dispatch Manager / Admin for contract close.
  - `NOT_INTERESTED` — Prospect declined.
  - `WRONG_NUMBER` — Invalid or disconnected number.
  - `NO_ANSWER` — No pickup after ring timeout.
  - `VOICEMAIL` — Left voicemail message.
  - `RNC` — Relevant, not converted (warm lead, follow up later).

- **FR-9.5: Callback Scheduling & Available Agent Routing:**
  - When disposition is `CALLBACK`, agent enters callback date, day, and time.
  - At the scheduled callback datetime, the system routes the callback to any **available active agent** currently in `OUTBOUND` mode (prioritizing available capacity so callbacks are never missed or delayed if a specific agent is offline or occupied).
  - The lead resurfaces at the **top of the available agent's** outbound queue with a prominent badge: **"Callback scheduled — Thu 2:00 PM"**.
  - The system auto-dials the lead when it resurfaces (same auto-dial rule as FR-9.3).
  - Callbacks are **never** automatically escalated to Admins — Admin involvement only happens via explicit warm transfer (FR-9.6).

- **FR-9.6: Warm Transfer to Dispatch Manager / Admin (Fleet Contract Close):**
  - Call agents are **qualifiers**, not closers. When a prospect expresses interest in a fleet contract, the agent initiates a **Telnyx attended (warm) transfer** (FR-1.2):
    1. Agent puts prospect on hold via Telnyx Call Control.
    2. Agent internally calls Dispatch Manager or Admin.
    3. Agent verbally briefs them with lead context (company name, NOU, call notes).
    4. Dispatch Manager / Admin accepts → prospect is bridged into the conversation → agent drops off.
  - Dispatch Manager / Admin receives a **screen pop** showing the full lead card (company name, NOU, contact details, decision maker email, agent call notes).
  - Upon contract signing, Dispatch Manager / Admin clicks **[ Convert to Fleet Account ]** — a pre-filled Fleet creation form populated from the lead record, with `acquiredByVaId` automatically linked for VA commission tracking via `FleetCommissionLedger`.

- **FR-9.7: Lead Lifecycle States:**
  - `NEW` → `CALLED` → `CALLBACK` → `CONVERTED` | `DEAD`
  - **`CONVERTED`** leads are linked to their resulting Fleet record via `acquiredByVaId` on the Fleet, enabling ongoing VA commission tracking (\$2–\$3 per completed job) through `FleetCommissionLedger`.
  - **`DEAD`** marks permanently closed leads (`NOT_INTERESTED`, `WRONG_NUMBER` after retries).

- **FR-9.8: Lead Data Schema (Postgres — No Redis Required):**
  - Lead records stored in PostgreSQL with `SELECT ... FOR UPDATE SKIP LOCKED` for concurrent agent queue access.
  - Key fields: `companyName`, `companyAddress`, `website`, `fleetManagerName`, `ceoOwnerName`, `contactNumber`, `altContactNumber`, `officialEmail`, `decisionMakerEmail`, `numberOfUnits` (NOU), `uploadedByVaId`, `assignedAgentId`, `disposition`, `callbackAt`, `callbackAssignedToId`, `notes`, `status`, `isDuplicate`.

---

## 4. Non-Functional Requirements
- **NFR-1: Performance & Zero Lag:** Express (Node.js + TypeScript) REST API response times $< 50\text{ms}$. Instant search on license plates and phone numbers.
- **NFR-2: Zero Data Duplication:** Strict database normalization per `data_models.md`. Tire size stored once on `Vehicle`; financial margins derived dynamically on read.
- **NFR-3: Exact Financial Integrity & Strict Regional Silos:** All monetary amounts are stored internally as whole integer cents / pence (`*_cents`) to completely eliminate binary floating-point rounding bugs (`0.1 + 0.2 != 0.3`). The UI always renders standard human-readable currency strings (e.g. `$160.00 CAD`, `$160.00 USD`, `£45.50 GBP`). Each country (Canada, US, UK) operates as a completely separate silo with its own pricing, tax rules, and currency. Blended or cross-currency totals are strictly forbidden — no mixed revenue numbers exist.
- **NFR-4: Security & Sandboxing (Client & Driver Financial Isolation):**
  - External clients (`FLEET_MANAGER`, `CUSTOMER_MEMBER`) are strictly sandboxed to their own vehicles, drivers, and invoices.
  - Mobile drivers (`DRIVER` role) are strictly isolated: driver consoles render ONLY driver personal earnings ($DC$), completed job counts, and physical cash collected in hand (`cashInHandCents`).
  - Wholesale material cost ($TC$), IT platform royalties ($IT\_B$), and company net profit margins are 100% hidden and omitted from driver payloads and mobile views.

