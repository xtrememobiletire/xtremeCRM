# Product Requirements Document (PRD) — XtremeCRM

## 1. Product Overview
XtremeCRM is an operations-focused Customer Relationship Management (CRM) and Dispatching platform purpose-built for mobile tire repair, seasonal tire changeovers, and emergency roadside automotive services operating in **Canada (CAD)**, the **United States (USD)**, and the **United Kingdom (GBP)**.

The software bridges the gap between high-pressure call-center intake, real-time fleet dispatching, mobile technician job execution, and rigorous back-office financial reconciliation.

---

## 2. User Personas & Roles

| Persona | Role in System | Key Needs |
| :--- | :--- | :--- |
| **Call Center Agent** | Handles inbound phone calls, WhatsApp inquiries, and website bookings. | Rapid keyboard entry, instant customer/vehicle auto-lookup, Google address geocoding, instant price quote, call disposition logging. |
| **Dispatch Manager** | Assigns roadside jobs to drivers based on proximity and urgency. | Urgent vs Standard queue visibility, real-time driver distance measurement, live status monitoring, driver messaging, payment verification. |
| **Mobile Driver / Tech** | Roadside technician operating a mobile tire van. | Mobile-first UI with large tap targets, GPS navigation links, one-tap status updates (`EN_ROUTE`, `ARRIVED`, `COMPLETED`), cash collection ledger. |
| **Junior Accountant** | Audits completed job tickets. | Verifies customer payments, attaches receipts, enters tire/part material costs (`TC`). |
| **Senior Accountant / Director** | Approves driver payouts and monitors company P&L. | Approves driver payouts (`DC`), audits gross vs net margins, monitors IT tech fees (`IT_B`), runs period reports. |
| **IT Team / Management** | Maintains infrastructure and collects per-job platform royalty. | Automated tracking of $1.50 CAD / $1.00 USD / £1.00 GBP fee per completed job. |

---

## 3. Functional Requirements

### 3.1. Lead Intake & Customer Management
- **FR-1.1: Call Source Capture:** System must capture lead channel: *Direct Call*, *WhatsApp*, or *Website*.
- **FR-1.2: Customer Lookup & Auto-Link:** Phone number is the unique index. If returning customer, system auto-fills name, alternate numbers, and previously serviced vehicles.
- **FR-1.3: Recipient Handling:** Form must support "Self-Booking" or "Recipient Booking" (capturing recipient name and phone if caller is booking on behalf of someone stranded).
- **FR-1.4: Breakdown Address Geocoding:** Address field integrates Google Maps Places Autocomplete and stores latitude/longitude coordinates.
- **FR-1.5: Vehicle & Tire Catalog:**
  - Year, Make, and Model capture.
  - Tire size entry formatted as `Width / Aspect Ratio / Rim Diameter` (e.g. `235/45R18`).

### 3.2. Roadside Service Catalog & Pricing
- **FR-2.1: Service Multi-Select:** Supports roadside offerings:
  - *Tire Services:* Tire repair (plug), stem valve replacement, new tire replacement, used tire replacement, new RIM replacement, used RIM replacement, tire swap (on rim), tire swap (off rim), spare tire change, tire rotation.
  - *Roadside Assistance:* Battery installation, battery replacement, jump start, battery booster, locksmith service, towing service.
- **FR-2.2: Urgency Tiers & Scheduling:**
  - `URGENT`: Emergency breakdown requiring immediate dispatch.
  - `STANDARD`: Same-day on-demand queue.
  - `FUTURE`: Scheduled appointment with date and time picker.
- **FR-2.3: Multi-Currency Tax Engine:**
  - Automatic regional tax calculation (e.g., Canada Ontario HST 13%, US localized tax, UK 20% VAT).
  - Tax checkbox toggle option for tax-exempt or manual tax overrides.
- **FR-2.4: Payment Method Recording:** Support for *E-Transfer* (Interac in Canada), *POS* (driver mobile card terminal), *Cash*, and *MOTO* (telephone card entry).

### 3.3. Call Disposition Logging
- **FR-3.1: Mandatory Outcome Tracking:** Every call handled by an agent must be tagged with a disposition:
  1. `Booked`: Appointment booked successfully.
  2. `Relevant (Not Converted) - RNC`: Genuine lead, but price/time did not match.
  3. `Business (Wrong Number) - WN`: Inbound misdial or vendor.
  4. `Irrelevant (Another Service) - IR`: Requested service outside scope.
  5. `Appointment Cancelled By CX`: Customer cancelled booking.

### 3.4. Dispatch & Fleet Logistics
- **FR-4.1: Queue Partitioning:** Dispatch dashboard organizes jobs into distinct views: Urgent, Standard, and Future Bookings.
- **FR-4.2: Driver Proximity Calculation:** Automatically calculates the straight-line or road distance between the job's breakdown coordinates and all active drivers.
- **FR-4.3: Driver Assignment:** Single-click dropdown to assign the nearest eligible mobile technician.
- **FR-4.4: Driver Messaging:** Internal two-way messaging channel between dispatcher and assigned driver per job.

### 3.5. Driver Mobile Execution (PWA / Mobile Web)
- **FR-5.1: Real-Time Job Push:** Assigned jobs push immediately to the driver’s mobile screen via Socket.io.
- **FR-5.2: State Progression:** Driver updates job state with large single-touch buttons:
  $$\text{ASSIGNED} \longrightarrow \text{EN\_ROUTE} \longrightarrow \text{ARRIVED} \longrightarrow \text{IN\_PROGRESS} \longrightarrow \text{COMPLETED}$$
- **FR-5.3: Cash Collection Ledger:** If payment method is *Cash*, driver records exact amount received. Updates driver's `cashInHand` balance.
- **FR-5.4: Payment Proof:** Driver attaches receipt or POS transaction reference on completion.

### 3.6. Financial Auditing & Accounting
- **FR-6.1: Job Costing & Net Profit Formula:**
  $$\text{Net Margin} = \text{Customer Paid (CP)} - \text{Tire/Material Cost (TC)} - \text{Driver Fee (DC)}$$
- **FR-6.2: Platform IT Fee (`IT_B`):** System automatically registers a fixed platform deduction per completed job:
  - Canada: **$1.50 CAD**
  - USA: **$1.00 USD**
  - UK: **£1.00 GBP**
- **FR-6.3: Two-Tier Audit Workflow:**
  - *Junior Accountant:* Audits receipt attachment, verifies POS/E-Transfer funds received, inputs material cost (`TC`).
  - *Senior Accountant / Director:* Verifies margin and authorizes driver commission payout (`DC`).
- **FR-6.4: Time Period Reporting:** Financial dashboard allows 1-click filtering:
  - *Today*, *Yesterday*, *Last 3 Days*, *1 Week*, *Monthly*.
  - Reports show Gross Revenue, Material Costs, Driver Payouts, Net Margin, and IT_B balances.

### 3.7. Zadarma Telephony & Cloud PBX Integration
- **FR-7.1: Zero-Seat-Cost Cloud PBX:** Integration with Zadarma Cloud PBX for USA, Canada, and UK DIDs, automated ring groups (hunt groups), and free SIP extensions without per-agent monthly seat fees.
- **FR-7.2: Inbound Screen-Pop Webhook:** Fastify exposes `/api/telephony/zadarma-webhook`. When a customer calls a DID, Zadarma sends `NOTIFY_START` / `NOTIFY_INTERNAL` $\rightarrow$ Fastify matches caller ID to the customer profile and emits a Socket.io event to auto-open the intake modal on the ringing agent's screen.
- **FR-7.3: Click-to-Dial & Audio Interface:** Agents can initiate calls via one-click callback API or embedded webphone widget, or take calls via desktop softphones (MicroSIP/Zoiper).
- **FR-7.4: Call Recording Synchronization:** When a call ends (`NOTIFY_END`), Zadarma’s MP3 recording link is automatically stored in `Job.callRecordingUrl`.

---

## 4. Non-Functional Requirements
- **NFR-1: Low Latency & High Speed:** Fastify REST API response times $< 50\text{ms}$ for core booking endpoints. Zero UI lag during rapid keyboard typing.
- **NFR-2: Zero Data Duplication:** Strict database normalization per `data_models.md`.
- **NFR-3: Mobile Performance:** Driver PWA optimized for weak mobile cellular connections (auto-reconnecting Socket.io).
- **NFR-4: Financial Accuracy:** All money values stored in integer cents. No floating point operations.
- **NFR-5: Security & Role Isolation:** RBAC enforcement ensuring drivers cannot view company profit margins or other drivers' earnings.
