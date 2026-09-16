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
| **Call Center Agent** | Handles inbound phone calls, WhatsApp inquiries, and website bookings. | Active/Inactive presence toggle, Telnyx inbound screen pop with pre-filled caller number, instant customer/vehicle auto-lookup, Google address geocoding, 16-service picker, tax toggle, customer user account provisioning, call disposition logging. |
| **Dispatch Manager** | Assigns roadside jobs to drivers based on proximity and urgency; manages fleet accounts. | Urgent vs Standard queue with expandable accordion, arbitrary address distance measurement tool, single-click driver assignment, live status monitoring, driver messaging, driver cash-in-hand tracking, Fleets directory. |
| **Mobile Driver / Tech** | Roadside technician operating a mobile tire van. | Mobile-first UI with large tap targets, GPS navigation links, one-tap status updates (`EN_ROUTE`, `ARRIVED`, `COMPLETED`), Gross & Net earnings display, in-app dispatch messaging, cash collection ledger. (Zero access to company net margins or wholesale material costs). |
| **Junior Accountant** | Audits completed tickets and states job expenses. | Explicitly states expenses for each completed job (material fees, repairer fees, other expenses), attaches supplier and customer receipts via Multer, logs initial payment verification check. |
| **Senior Accountant / Director** | Approves driver/repairer payouts, verifies payments, and monitors company P&L. | Verifies customer payment (`isPaymentVerified = true`), audits stated expenses, approves repairer payouts, monitors IT platform royalties (`IT_B`), runs multi-currency period reports. |
| **Virtual Assistant (VA)** | B2B cold calling & fleet lead acquisition. | ViciDial/BulkVS outreach, warm transfer to Dispatch Manager, automatic tracking of **$2–$3 commission per completed job** for acquired fleet accounts. |

### 2.2. External Customer Accounts (NOT Company Staff — Sandboxed Client Portals)
| Persona | Access Portal | Key Needs |
| :--- | :--- | :--- |
| **Fleet Manager (B2B)** | `/fleet-dashboard` | Manage 18+ registered fleet vehicles with license plates (e.g. `KT-15`, `KT-18`) and tire sizes (`11R22.5`); manage driver directory ("My Drivers"); book scheduled maintenance or emergency roadside requests; monitor live service status; receive internal company messages & notifications; view **Pending Invoices** and **Paid Invoices**; download professional PDF invoices. |
| **Personal Member (B2C)** | `/member-dashboard` | Store personal vehicles and tire specs; book priority roadside assistance with member discounts; track live technician approach; view past job history and payment receipts. |

---

## 3. Functional Requirements

### 3.1. Inbound Call Intake & Multiple Agent Portal
- **FR-1.1: Agent Presence State:** Every agent has an `Active` and `Inactive` status toggle. When inactive, calls bypass the agent; when active, the agent receives incoming call events.
- **FR-1.2: Telnyx Inbound Screen Pop:** When an incoming call connects via Telnyx Webhook / WebRTC, an intake modal immediately pops open on an active agent's screen with the caller's phone number already populated.
- **FR-1.3: Customer & Fleet Auto-Match:** System queries database by phone number. If returning, past customer name, fleet account, alternate numbers, vehicles, and tire sizes are populated instantly.
- **FR-1.4: Lead Channel Selector:** Intake form includes lead source dropdown: `Direct Call`, `Whatsapp`, `Website`, `Landing Page`, `Fleet Portal`, `Member Portal`.
- **FR-1.5: Recipient Handling:** Form supports `Self-Booking Or Recipient` toggle (capturing recipient name and phone if caller is booking on behalf of someone stranded).
- **FR-1.6: Breakdown Address Geocoding:** Address field integrates Google Maps Places Autocomplete and stores latitude/longitude coordinates (`serviceLat`, `serviceLng`).
- **FR-1.7: Vehicle & Tire Catalog:**
  - Vehicle Year, Make, Model capture.
  - Tire size entry formatted as standard specification (e.g. `235/45R18` or commercial truck `11R22.5`).
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
- **FR-1.10: Mandatory Outcome Tracking:** Every call handled by an agent must be tagged with a disposition:
  `Booked`, `Relevant Not Converted (RNC)`, `Wrong Number (WN)`, `Irrelevant Service (IR)`, `Cancelled By Customer`.

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
  - Dedicated boolean verification flag: `isPaymentVerified` (default `false`) with verifier identity and audit timestamp.
- **FR-6.3: Net Profit Dynamic Calculation:**
  $$\text{Total Job Expense} = TC + DC + \text{Other Expenses}$$
  $$\text{Net Profit} = \text{Customer Paid (CP)} - \text{Total Job Expense}$$
  $$\text{Net After IT\_B} = \text{Net Profit} - \text{IT\_B}$$
- **FR-6.4: Platform Royalty Fee (`IT_B`):**
  - Deducted per completed job: Canada: **$1.50 CAD**, USA: **$1.00 USD**, UK: **£1.00 GBP**.
- **FR-6.5: Receipt Attachments via Multer:** Customer payment proof (`receiptUrl`) and wholesale supplier invoice (`materialReceiptUrl`).

### 3.7. Regional Territorial Hubs
- **FR-7.1: US Regional Hub:** 11815 Medway Church Loop, Manassas, VA 20109 | (804) 326-5442 (Covers VA, MD, DC, KY, NC, TN in USD).
- **FR-7.2: Canada Regional Hub:** 857 Winterton Way, Mississauga, ON L5V 1Z5 | (437) 375-5674 (Covers ON, GTA in CAD).

---

## 4. Non-Functional Requirements
- **NFR-1: Performance & Zero Lag:** Express (Node.js + TypeScript) REST API response times $< 50\text{ms}$. Instant search on license plates and phone numbers.
- **NFR-2: Zero Data Duplication:** Strict database normalization per `data_models.md`. Tire size stored once on `Vehicle`; financial margins derived dynamically on read.
- **NFR-3: Exact Financial Integrity:** All monetary amounts stored as integer cents (`*_cents`). Floating-point arithmetic strictly forbidden. Currencies (USD vs CAD) kept in separate regional ledgers.
- **NFR-4: Security & Sandboxing:** External clients (`FLEET_MANAGER`, `CUSTOMER_MEMBER`) are strictly sandboxed to their own vehicles, drivers, and invoices. Internal company margins, technician payouts, and wholesale costs are never exposed to external clients or mobile drivers.
