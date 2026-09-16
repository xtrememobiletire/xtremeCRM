# Data Models & Schema Design — XtremeCRM

> **Single Source of Truth:** Schema definition lives directly in [`backend/prisma/schema.prisma`](file:///mnt/mydrive/Projects/xtremeCRM/backend/prisma/schema.prisma).  
> Do NOT duplicate schema text here. Read `schema.prisma` directly.

---

## 1. Design Principles & Derived Formulas

- **Strict Regional Silos (Zero Currency Mixing):**
  - Operations in Canada (`CA`), USA (`US`), and UK (`UK`) strictly segregated.
  - Every job, customer, fleet, and invoice is tied to explicit `CountryCode` (`CA`, `US`, `UK`) and `CurrencyCode` (`CAD`, `USD`, `GBP`).
  - No blended currency math. Canada = CAD cents, US = USD cents, UK = GBP pence.
- **Exact Integer Cents:**
  - All money stored as integers in **cents / pence** (`amount_cents`). Floating point prohibited.
- **Computed Metrics (Derived on Read — No Drifting DB State):**
  $$\text{Total Job Expense} = \text{materialCostCents (TC)} + \text{repairerFeeCents (DC)} + \text{otherExpenseCents}$$
  $$\text{Net Profit} = \text{totalCents (CP)} - \text{Total Job Expense}$$
  $$\text{Total Net After IT\_B} = \text{Net Profit} - \text{itPlatformFeeCents (IT\_B)}$$
  $$\text{Invoice Line Total} = \text{unitPriceCents} \times \text{quantity}$$
  $$\text{Customer Membership Active} = \text{membershipExpiresAt} \ne \text{null} \land \text{membershipExpiresAt} > \text{now()}$$
  $$\text{Verified Customer Payment} = \text{paymentVerifiedById} \ne \text{null} \lor \text{paymentStatus} = \text{VERIFIED\_PAID}$$
  $$\text{Tax Exemption} = \text{taxRateBps} = 0$$
  $$\text{Message Read} = \text{readAt} \ne \text{null}$$
  $$\text{Live ETA Countdown} = \max(0, \text{estimatedArrivalAt} - \text{now()})$$

---

## 2. Duplication Audit & Omission Rationale

| Field / Concept | Where It Lives | Omitted From DB / Replaced | Reason / Rule |
| :--- | :--- | :--- | :--- |
| **Strict Regional Silos** | `CountryCode` & `CurrencyCode` enums | Blended cross-currency conversions | *Zero Mixing:* US, CA, UK operations have independent pricing, currencies, and reporting. |
| **Socket Heartbeat (`isOnline`)** | Redis / Socket.io (`EX 300`) | PostgreSQL `users` table | High-frequency churn (reconnects/tunnels) = useless DB writes. Kept in-memory. |
| **Call Center Availability** | `User.isAgentActive` (Postgres) | Socket heartbeat | Persistent human toggle ("I accept calls") for Telnyx routing. Survives server deploys. |
| **Live ETA** | `Job.estimatedArrivalAt` (Timestamptz) | `Job.etaMinutes` frozen int | Fixed timestamp lets UI calculate ticking live countdown without DB writes. |
| **Service Catalog** | `JobServiceItem[]` line items | `Job.serviceType` string | Single source of truth. Freeform string contradicts itemized services. |
| **Portal Navigation** | `relatedEntityType` + `relatedEntityId` | `PortalMessage.actionUrl` | Storing `/fleet-dashboard/invoices/...` breaks when routes rename. Frontend router resolves entity refs. |
| **Message Read Status** | `PortalMessage.readAt` (Timestamptz) | `PortalMessage.isRead` boolean | Derived on read (`readAt != null`). Timestamp gives audit trail without redundant boolean. |
| **Fleet Vehicle Count** | *Derived on Read* (`fleet.vehicles.count`) | `Fleet.fleetSize` mutable counter | Prevents drift between counter and actual rows. |
| **Fleet Commission State** | *Derived on Read* (`paidAt != null`) | `FleetCommissionLedger.isPaid` | Eliminates duplicate boolean alongside timestamp. |
| **Driver Cash Balance** | *Derived on Read* (`SUM(DriverCashLedger.amountCents)`) | `User.cashInHandCents` mutable counter | Eliminates reconciliation drift. Immutable ledger is truth. |
| **Physical Cash Audit** | `DriverCashLedger` (`onDelete: Restrict`) | Mutable counter on User | Audit records outlive user accounts. |
| **Service Location** | `Job.serviceAddress` (Address string) | `serviceLat`, `serviceLng` | Distance Matrix API accepts strings directly. Eliminates Null Island (0.0, 0.0). |
| **Vehicle Regional Uniqueness** | `Vehicle.countryCode` | Implicit join lookup | Enforces `@@unique([countryCode, licensePlate])` per territory. |
| **Customer Portal Account** | *Derived on Read* (`userId != null`) | `Customer.isUserAccountCreated` | Account exists iff `userId` populated. |
| **B2C Membership Status** | *Derived on Read* (`membershipExpiresAt > now()`) | `Customer.isMembershipActive` | Eliminates drift between boolean and timestamp. |
| **B2B Contract Verification** | *Derived on Read* (`status == APPROVED`) | `Fleet.isVerified` boolean | Duplicate state: `APPROVED` means verified. |
| **Public Booking Verification** | *Derived on Read* (`status != UNVERIFIED_PUBLIC`) | `Job.isVerified` boolean | Eliminates two flags for same operational condition. |
| **Tax Exemption** | *Derived on Read* (`taxRateBps == 0`) | `Job.isTaxExempt` boolean | 0 bps = exempt. Zero redundant booleans. |
| **Line Item Total** | *Derived on Read* (`unitPriceCents * quantity`) | `InvoiceItem.totalCents` | Prevents calculation desync. |
| **Warehouse Models** | Static Config (`server/config/hubs.ts`) | Relational database table | *Ponytail Deferral:* 2 fixed hubs (Manassas & Mississauga) are static code constants. |
| **Accountant Roles** | Unified `UserRole.ACCOUNTANT` | Split `ACCOUNTANT_JR` & `ACCOUNTANT_SR` | Single role with permission guards. |
