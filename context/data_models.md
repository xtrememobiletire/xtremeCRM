# Data Models & Schema Design — XtremeCRM

## 1. Design Principles (Zero Duplication & Regional Isolation)
- **Strict Regional Silos (Zero Currency Mixing):**
  - Operations in Canada (`CA`), the United States (`US`), and the United Kingdom (`UK`) are strictly segregated.
  - Every job, customer, fleet, and invoice is tied to an explicit `CountryCode` (`CA`, `US`, `UK`) and `CurrencyCode` (`CAD`, `USD`, `GBP`).
  - **No Blended Multi-Currency Math:** The system never mathematically converts or sums `CAD + USD + GBP` into a single global revenue figure. Dashboards and reports display clean, country-isolated financial totals.
  - Prices differ by country (Canada jobs charge in CAD cents, US jobs charge in USD cents, UK jobs charge in GBP pence).
- **Exact Integer Cents Storage:**
  - All financial values are stored as integers in **cents / pence** (`amount_cents`). Floating-point money arithmetic is strictly prohibited to eliminate computer binary rounding bugs (e.g. `$160.00` = `16000`).
- **Computed Metrics (Derived on Read — No Drifting State):**
  $$\text{Total Job Expense} = \text{materialCostCents (TC)} + \text{repairerFeeCents (DC)} + \text{otherExpenseCents}$$
  $$\text{Net Profit} = \text{totalCents (CP)} - \text{Total Job Expense}$$
  $$\text{Total Net After IT\_B} = \text{Net Profit} - \text{itPlatformFeeCents (IT\_B)}$$
  $$\text{Invoice Line Total} = \text{unitPriceCents} \times \text{quantity}$$
  $$\text{Customer Membership Active} = \text{membershipExpiresAt} \ne \text{null} \land \text{membershipExpiresAt} > \text{now()}$$
  $$\text{Verified Customer Payment} = \text{paymentVerifiedById} \ne \text{null} \lor \text{paymentStatus} = \text{VERIFIED\_PAID}$$
  $$\text{Tax Exemption} = \text{taxRateBps} = 0$$
- **Physical Cash Accountability (Audit Trail):**
  - Drivers collecting physical cash log transactions into `DriverCashLedger`.
  - Foreign keys use `onDelete: Restrict` so financial audit records can never be deleted if a user is offboarded.
- **Service Traceability & 1-Click Invoicing:**
  - Work items performed are preserved in `JobServiceItem`, allowing 1-click invoice generation without manual re-typing.
- **Direct Portal Messaging:**
  - Internal portal communication via `PortalMessage` between fleet managers and CRM dispatchers eliminates reliance on third-party email platforms.

---

## 2. Complete Prisma Schema (`schema.prisma`)

```prisma
datasource db {
  provider = "postgresql"
}

generator client {
  provider = "prisma-client-js"
}

// --------------------------------------------------------
// ENUMS (Strict Typed Isolation)
// --------------------------------------------------------

enum CountryCode {
  CA
  US
  UK
}

enum CurrencyCode {
  CAD
  USD
  GBP
}

enum UserRole {
  // Internal Staff Roles (Operate in /admin)
  ADMIN
  CALL_AGENT
  DISPATCHER
  DRIVER
  ACCOUNTANT // ponytail: JR and SR accountant split deferred to single role with audit permissions
  VIRTUAL_ASSISTANT

  // External Portal Client Roles (Operate in client dashboards)
  FLEET_MANAGER
  CUSTOMER_MEMBER
}

enum CustomerType {
  RETAIL
  MEMBERSHIP
}

enum MembershipTier {
  STANDARD
  GOLD
  PLATINUM
}

enum FleetStatus {
  PENDING
  APPROVED
  SUSPENDED
}

enum InvoiceStatus {
  DRAFT
  PENDING
  PAID
  OVERDUE
  CANCELLED
}

enum JobStatus {
  PENDING
  UNVERIFIED_PUBLIC // ponytail: isVerified boolean derived from status != UNVERIFIED_PUBLIC
  ASSIGNED
  EN_ROUTE
  ARRIVED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

enum JobUrgency {
  URGENT
  STANDARD
  FUTURE
}

enum JobSource {
  DIRECT_CALL
  WHATSAPP
  WEBSITE
  LANDING_PAGE_SELF_BOOK
  FLEET_PORTAL
  MEMBER_PORTAL
}

enum JobDisposition {
  BOOKED
  RELEVANT_NOT_CONVERTED
  WRONG_NUMBER
  IRRELEVANT_SERVICE
  CANCELLED_BY_CUSTOMER
}

enum PaymentMethod {
  E_TRANSFER
  POS
  CASH
  MOTO
  STRIPE
}

enum PaymentStatus {
  UNPAID
  PAID_PENDING_VERIFICATION
  VERIFIED_PAID
  REFUNDED
}

enum CashTransactionType {
  JOB_COLLECTION       // Positive: Driver collects physical cash from customer
  DISPATCHER_DEPOSIT   // Negative: Driver deposits cash envelope to dispatcher
  PAYOUT_DEDUCTION     // Negative: Cash kept as advance against driver commission
  ADJUSTMENT           // Verified reconciliation correction
}

enum ServiceCategory {
  TIRE_SERVICE
  ROADSIDE_ASSISTANCE
  MAINTENANCE
}

// --------------------------------------------------------
// CORE USERS & AUTHENTICATION
// --------------------------------------------------------

model User {
  id           String      @id @default(uuid())
  email        String      @unique
  passwordHash String      @map("password_hash")
  fullName     String      @map("full_name")
  role         UserRole    @default(CALL_AGENT)
  countryCode  CountryCode @default(CA) @map("country_code") // Strict regional silo: CA, US, UK
  phone        String?     // E.164 formatted, e.g. +14165550192

  // Agent Presence (Active / Inactive toggle for internal staff)
  isAgentActive Boolean @default(false) @map("is_agent_active")

  // Driver Telemetry & Balance (inlined from DriverProfile - ponytail: 1:1 table avoided)
  currentLat      Float?    @map("current_lat")
  currentLng      Float?    @map("current_lng")
  lastPingAt      DateTime? @db.Timestamptz @map("last_ping_at")
  isOnline        Boolean   @default(false) @map("is_online")
  cashInHandCents Int       @default(0) @map("cash_in_hand_cents")

  createdAt DateTime @default(now()) @db.Timestamptz @map("created_at")
  updatedAt DateTime @updatedAt @db.Timestamptz @map("updated_at")

  // Internal Staff Relations
  createdJobs       Job[]     @relation("AgentJobs")
  assignedJobs      Job[]     @relation("DriverJobs")
  statedJobExpenses Job[]     @relation("JobExpensesStatedBy")
  verifiedPayments  Job[]     @relation("JobPaymentsVerifiedBy")
  auditedJobs       Job[]     @relation("JobAuditedBy")
  sourcedFleets     Fleet[]   @relation("VirtualAssistantFleets")
  createdInvoices   Invoice[] @relation("InvoicesCreated")

  // Financial & Operational Ledger Relations (Restrict: financial records must NEVER cascade-delete)
  driverCashLedgers   DriverCashLedger[]      @relation("DriverCashLedgers")
  verifiedCashLedgers DriverCashLedger[]      @relation("VerifiedCashLedgers")
  vaCommissions       FleetCommissionLedger[] @relation("VACommissions")
  sentPortalMessages  PortalMessage[]         @relation("SentPortalMessages")
  sentJobMessages     JobMessage[]            @relation("SentJobMessages")

  // External Portal Client Relations
  customerAccount Customer? @relation("UserCustomer")
  managedFleet    Fleet?    @relation("FleetManagerUser")

  @@index([countryCode, role])
  @@index([phone])
  @@map("users")
}

// --------------------------------------------------------
// CUSTOMERS & MEMBERSHIPS (B2C)
// --------------------------------------------------------

model Customer {
  id           String       @id @default(uuid())
  fullName     String       @map("full_name")
  phone        String       // E.164 formatted primary lookup index (e.g. +14165550192)
  altPhone     String?      @map("alt_phone")
  email        String?
  countryCode  CountryCode  @default(CA) @map("country_code") // Strict regional silo: CA, US, UK
  customerType CustomerType @default(RETAIL) @map("customer_type")

  // Membership Benefits (B2C)
  // ponytail: isMembershipActive derived dynamically: membershipExpiresAt != null && membershipExpiresAt > now()
  membershipTier      MembershipTier? @map("membership_tier")
  membershipExpiresAt DateTime?       @db.Timestamptz @map("membership_expires_at")

  // Member Portal Credentials (ponytail: isUserAccountCreated derived: userId != null)
  userId String? @unique @map("user_id")
  user   User?   @relation("UserCustomer", fields: [userId], references: [id])

  createdAt DateTime @default(now()) @db.Timestamptz @map("created_at")
  updatedAt DateTime @updatedAt @db.Timestamptz @map("updated_at")

  vehicles       Vehicle[]
  jobs           Job[]
  invoices       Invoice[]
  portalMessages PortalMessage[]

  @@unique([countryCode, phone])
  @@index([customerType])
  @@index([phone])
  @@map("customers")
}

// --------------------------------------------------------
// FLEETS & B2B ACCOUNTS
// --------------------------------------------------------

model Fleet {
  id            String      @id @default(uuid())
  fleetCode     String      @unique @map("fleet_code") // e.g. "XMT-5132"
  name          String      // Company legal name (e.g. "KT Group")
  contactPerson String      @map("contact_person")
  phone         String      // E.164 formatted primary management phone (e.g. +17035550144)
  email         String?     // Billing/contact email
  website       String?     // e.g. "https://www.ktgroupcanada.ca/"
  address       String?     // e.g. "10100 Richmond Hwy, Lorton, VA 22079"
  fleetSize     Int         @default(1) @map("fleet_size")
  countryCode   CountryCode @default(US) @map("country_code") // Strict regional silo: CA, US, UK
  status        FleetStatus @default(PENDING) // Must be verified before active dispatching

  // Fleet Manager Login Credentials (role: FLEET_MANAGER)
  managerUserId String? @unique @map("manager_user_id")
  managerUser   User?   @relation("FleetManagerUser", fields: [managerUserId], references: [id])

  // B2B Contract Verification (ponytail: isVerified derived: status == APPROVED || contractSignedAt != null)
  contractSignedAt DateTime? @db.Timestamptz @map("contract_signed_at")

  // Lead attribution for Virtual Assistant
  virtualAssistantId String? @map("virtual_assistant_id")
  virtualAssistant   User?   @relation("VirtualAssistantFleets", fields: [virtualAssistantId], references: [id])

  createdAt DateTime @default(now()) @db.Timestamptz @map("created_at")
  updatedAt DateTime @updatedAt @db.Timestamptz @map("updated_at")

  vehicles       Vehicle[]
  drivers        FleetDriver[]
  jobs           Job[]
  invoices       Invoice[]
  commissions    FleetCommissionLedger[]
  portalMessages PortalMessage[]

  @@index([countryCode, status])
  @@index([phone])
  @@map("fleets")
}

model FleetDriver {
  id           String   @id @default(uuid())
  fleetId      String   @map("fleet_id")
  fleet        Fleet    @relation(fields: [fleetId], references: [id], onDelete: Cascade)
  fullName     String   @map("full_name")
  phone        String   // E.164 formatted driver phone for 24/7 roadside caller verification
  licensePlate String?  @map("license_plate") // Fast plate search for roadside breakdown
  isActive     Boolean  @default(true) @map("is_active")
  createdAt    DateTime @default(now()) @db.Timestamptz @map("created_at")
  updatedAt    DateTime @updatedAt @db.Timestamptz @map("updated_at")

  @@index([fleetId])
  @@index([phone])
  @@index([licensePlate])
  @@map("fleet_drivers")
}

// --------------------------------------------------------
// VEHICLES (Both Fleet & Retail)
// --------------------------------------------------------

model Vehicle {
  id           String    @id @default(uuid())
  customerId   String?   @map("customer_id")
  customer     Customer? @relation(fields: [customerId], references: [id], onDelete: Cascade)
  fleetId      String?   @map("fleet_id")
  fleet        Fleet?    @relation(fields: [fleetId], references: [id], onDelete: Cascade)
  year         Int
  make         String
  model        String
  licensePlate String?   @map("license_plate") // e.g. "KT-15", "KT-18"
  vin          String?
  tireSize     String    @map("tire_size")     // Single source of truth (e.g. "11R22.5", "235/65R17")
  createdAt    DateTime  @default(now()) @db.Timestamptz @map("created_at")
  updatedAt    DateTime  @updatedAt @db.Timestamptz @map("updated_at")

  jobs Job[]

  @@index([customerId])
  @@index([fleetId])
  @@index([licensePlate])
  @@map("vehicles")
}

// --------------------------------------------------------
// INVOICING & FINANCIAL INSTRUMENTS (Strict Country Silos)
// --------------------------------------------------------

model Invoice {
  id            String        @id @default(uuid())
  invoiceNumber String        @unique @map("invoice_number") // Format: [Initials]-[Country]-[digits], e.g. "MW-US-0002"
  countryCode   CountryCode   @default(US) @map("country_code") // Strict regional silo: CA, US, UK
  currency      CurrencyCode  @default(USD) // Strict currency lock: CAD for CA, USD for US, GBP for UK

  fleetId    String?   @map("fleet_id")
  fleet      Fleet?    @relation(fields: [fleetId], references: [id])
  customerId String?   @map("customer_id")
  customer   Customer? @relation(fields: [customerId], references: [id])

  issueDate DateTime      @db.Timestamptz @map("issue_date")
  dueDate   DateTime      @db.Timestamptz @map("due_date")
  status    InvoiceStatus @default(PENDING)

  subtotalCents  Int @map("subtotal_cents")
  taxAmountCents Int @map("tax_amount_cents")
  totalCents     Int @map("total_cents") // Currency units in cents/pence (never mixed across countries)

  createdById String @map("created_by_id")
  createdBy   User   @relation("InvoicesCreated", fields: [createdById], references: [id])

  paidAt        DateTime?      @db.Timestamptz @map("paid_at")
  paymentMethod PaymentMethod? @map("payment_method")
  notes         String?

  items InvoiceItem[]
  jobs  Job[]

  createdAt DateTime @default(now()) @db.Timestamptz @map("created_at")
  updatedAt DateTime @updatedAt @db.Timestamptz @map("updated_at")

  @@index([fleetId, status])
  @@index([customerId, status])
  @@index([countryCode, status])
  @@index([dueDate])
  @@map("invoices")
}

model InvoiceItem {
  id             String  @id @default(uuid())
  invoiceId      String  @map("invoice_id")
  invoice        Invoice @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  itemDetails    String  @map("item_details") // e.g. "Emergency Steer Tire Replacement (11R22.5)"
  unitPriceCents Int     @map("unit_price_cents") // e.g. 42000 ($420.00)
  quantity       Int     @default(1)
  // ponytail: totalCents derived: unitPriceCents * quantity

  @@map("invoice_items")
}

// --------------------------------------------------------
// JOBS & DISPATCH (Operational Work Orders)
// --------------------------------------------------------

model Job {
  id          String      @id @default(uuid())
  jobCode     String      @unique @map("job_code") // e.g. "JOB-US-10492"
  customerId  String?     @map("customer_id")
  customer    Customer?   @relation(fields: [customerId], references: [id])
  vehicleId   String      @map("vehicle_id")
  vehicle     Vehicle     @relation(fields: [vehicleId], references: [id])
  fleetId     String?     @map("fleet_id")
  fleet       Fleet?      @relation(fields: [fleetId], references: [id])
  invoiceId   String?     @map("invoice_id")
  invoice     Invoice?    @relation(fields: [invoiceId], references: [id])
  driverId    String?     @map("driver_id")
  driver      User?       @relation("DriverJobs", fields: [driverId], references: [id])
  createdById String      @map("created_by_id")
  createdBy   User        @relation("AgentJobs", fields: [createdById], references: [id])

  // Lifecycle & Priorities
  status      JobStatus   @default(PENDING)
  urgency     JobUrgency  @default(STANDARD)
  source      JobSource   @default(DIRECT_CALL)
  serviceType String      @default("Standard Service") @map("service_type")
  countryCode CountryCode @default(CA) @map("country_code") // Strict regional silo: CA, US, UK

  // Telephony
  telnyxCallId String? @map("telnyx_call_id")

  // On-Scene Contact & Roadside Details (Intake Capture)
  recipientName  String? @map("recipient_name")  // Name of driver on scene if caller is 3rd-party
  recipientPhone String? @map("recipient_phone") // E.164 phone of on-scene driver
  problemNotes   String? @db.Text @map("problem_notes") // Roadside notes ("flat on shoulder, wheel lock in glovebox")

  // Service Location & Timing
  serviceAddress  String    @map("service_address")
  serviceLat      Float     @default(0.0) @map("service_lat")
  serviceLng      Float     @default(0.0) @map("service_lng")
  etaMinutes      Int?      @map("eta_minutes")
  appointmentDate DateTime? @db.Timestamptz @map("appointment_date") // Scheduled booking date/time
  assignedAt      DateTime? @db.Timestamptz @map("assigned_at")
  arrivedAt       DateTime? @db.Timestamptz @map("arrived_at")
  completedAt     DateTime? @db.Timestamptz @map("completed_at")

  // Call Center Outcome
  disposition      JobDisposition @default(BOOKED)
  dispositionNotes String?        @map("disposition_notes")

  // ------------------------------------------------------
  // FINANCIALS & REVENUE (Inlined from JobFinancial)
  // Strict Regional Currency: CAD for CA, USD for US, GBP for UK
  // ------------------------------------------------------
  currency       CurrencyCode   @default(CAD) // Matched to countryCode - never mix currencies
  subtotalCents  Int            @default(0) @map("subtotal_cents")
  taxRateBps     Int            @default(0) @map("tax_rate_bps") // Basis points (13% = 1300 bps) - ponytail: taxExempt if 0
  taxAmountCents Int            @default(0) @map("tax_amount_cents")
  totalCents     Int            @default(0) @map("total_cents") // Gross Customer Paid (CP)
  paymentMethod  PaymentMethod? @map("payment_method")
  paymentStatus  PaymentStatus  @default(UNPAID) @map("payment_status")

  // Job Expense Stating (Accountant inputs actual ticket expenses in regional currency cents)
  materialCostCents Int       @default(0) @map("material_cost_cents") // Wholesale tire & parts cost (TC)
  repairerFeeCents  Int       @default(0) @map("repairer_fee_cents")  // Repairer/technician labor (DC)
  otherExpenseCents Int       @default(0) @map("other_expense_cents") // Incidental expenses (tolls, disposal)
  expenseNotes      String?   @map("expense_notes")                   // Explanation of job expenses
  expenseStatedById String?   @map("expense_stated_by_id")
  expenseStatedBy   User?     @relation("JobExpensesStatedBy", fields: [expenseStatedById], references: [id])
  expenseStatedAt   DateTime? @db.Timestamptz @map("expense_stated_at")

  // Payment Verification & Auditing
  // ponytail: isPaymentVerified derived: paymentVerifiedById != null || paymentStatus == VERIFIED_PAID
  paymentVerifiedById String?   @map("payment_verified_by_id")
  paymentVerifiedBy   User?     @relation("JobPaymentsVerifiedBy", fields: [paymentVerifiedById], references: [id])
  paymentVerifiedAt   DateTime? @db.Timestamptz @map("payment_verified_at")

  // Platform Royalty: Set per region (CA: 150 cents [$1.50 CAD], US: 100 cents [$1.00 USD], UK: 100 pence [£1.00 GBP])
  itPlatformFeeCents Int @default(0) @map("it_platform_fee_cents")

  // Receipt Proofs (ponytail: isAudited derived: auditedById != null)
  receiptUrl         String?   @map("receipt_url")          // Customer payment receipt
  materialReceiptUrl String?   @map("material_receipt_url") // Supplier wholesale parts slip
  auditedById        String?   @map("audited_by_id")
  auditedBy          User?     @relation("JobAuditedBy", fields: [auditedById], references: [id])
  auditedAt          DateTime? @db.Timestamptz @map("audited_at")

  createdAt DateTime @default(now()) @db.Timestamptz @map("created_at")
  updatedAt DateTime @updatedAt @db.Timestamptz @map("updated_at")

  // Operational & Audit Relations
  serviceItems     JobServiceItem[]
  cashLedgers      DriverCashLedger[]
  messages         JobMessage[]
  fleetCommissions FleetCommissionLedger[]

  @@index([countryCode, status])
  @@index([countryCode, createdAt])
  @@index([customerId])
  @@index([status])
  @@index([urgency])
  @@index([driverId])
  @@index([fleetId])
  @@index([invoiceId])
  @@index([paymentStatus])
  @@index([completedAt])
  @@index([appointmentDate])
  @@index([telnyxCallId])
  @@map("jobs")
}

// --------------------------------------------------------
// JOB SERVICE ITEMS (16-Service Catalog Line Items)
// --------------------------------------------------------

model JobServiceItem {
  id             String          @id @default(uuid())
  jobId          String          @map("job_id")
  job            Job             @relation(fields: [jobId], references: [id], onDelete: Cascade)
  serviceName    String          @map("service_name") // Standardized service title from 16-service catalog
  category       ServiceCategory @default(TIRE_SERVICE)
  unitPriceCents Int             @map("unit_price_cents") // Required price in cents (no silent 0 default)
  quantity       Int             @default(1)
  notes          String?
  createdAt      DateTime        @default(now()) @db.Timestamptz @map("created_at")

  @@index([jobId])
  @@map("job_service_items")
}

// --------------------------------------------------------
// DRIVER CASH AUDIT LEDGER (Immutable Cash Accountability)
// --------------------------------------------------------

model DriverCashLedger {
  id           String              @id @default(uuid())
  driverId     String              @map("driver_id")
  // Restrict: Financial cash ledger records must NEVER evaporate when a driver user is deleted
  driver       User                @relation("DriverCashLedgers", fields: [driverId], references: [id], onDelete: Restrict)
  amountCents  Int                 @map("amount_cents") // Positive = cash collected, Negative = cash deposit to dispatch
  type         CashTransactionType
  jobId        String?             @map("job_id")
  job          Job?                @relation(fields: [jobId], references: [id], onDelete: SetNull)
  verifiedById String?             @map("verified_by_id")
  verifiedBy   User?               @relation("VerifiedCashLedgers", fields: [verifiedById], references: [id])
  notes        String?
  createdAt    DateTime            @default(now()) @db.Timestamptz @map("created_at")

  @@index([driverId, createdAt])
  @@index([jobId])
  @@map("driver_cash_ledgers")
}

// --------------------------------------------------------
// FLEET COMMISSION LEDGER (Virtual Assistant Attributions)
// --------------------------------------------------------

model FleetCommissionLedger {
  id                 String      @id @default(uuid())
  fleetId            String      @map("fleet_id")
  fleet              Fleet       @relation(fields: [fleetId], references: [id], onDelete: Restrict)
  virtualAssistantId String      @map("virtual_assistant_id")
  // Restrict: Commission records must outlive staff records for accounts-payable integrity
  virtualAssistant   User        @relation("VACommissions", fields: [virtualAssistantId], references: [id], onDelete: Restrict)
  jobId              String?     @map("job_id")
  job                Job?        @relation(fields: [jobId], references: [id], onDelete: SetNull)
  amountCents        Int         @map("amount_cents") // Stored in cents (e.g. 250 for $2.50) agreed per fleet
  isPaid             Boolean     @default(false) @map("is_paid")
  paidAt             DateTime?   @db.Timestamptz @map("paid_at")
  notes              String?
  createdAt          DateTime    @default(now()) @db.Timestamptz @map("created_at")

  @@index([virtualAssistantId, isPaid])
  @@index([fleetId])
  @@map("fleet_commission_ledgers")
}

// --------------------------------------------------------
// PORTAL MESSAGES (Direct Inbox / No Third-Party Email)
// --------------------------------------------------------

model PortalMessage {
  id         String    @id @default(uuid())
  fleetId    String?   @map("fleet_id")
  fleet      Fleet?    @relation(fields: [fleetId], references: [id], onDelete: Cascade)
  customerId String?   @map("customer_id")
  customer   Customer? @relation(fields: [customerId], references: [id], onDelete: Cascade)
  senderId   String    @map("sender_id")
  sender     User      @relation("SentPortalMessages", fields: [senderId], references: [id])
  subject    String
  content    String    @db.Text
  actionUrl  String?   @map("action_url") // e.g. "/fleet-dashboard/invoices/MW-US-0002"
  isRead     Boolean   @default(false) @map("is_read")
  createdAt  DateTime  @default(now()) @db.Timestamptz @map("created_at")

  @@index([fleetId, isRead])
  @@index([customerId, isRead])
  @@map("portal_messages")
}

// --------------------------------------------------------
// JOB MESSAGES (Two-Way Driver & Dispatcher Chat)
// --------------------------------------------------------

model JobMessage {
  id        String   @id @default(uuid())
  jobId     String   @map("job_id")
  job       Job      @relation(fields: [jobId], references: [id], onDelete: Cascade)
  senderId  String   @map("sender_id")
  sender    User     @relation("SentJobMessages", fields: [senderId], references: [id])
  content   String   @db.Text
  createdAt DateTime @default(now()) @db.Timestamptz @map("created_at")

  @@index([jobId, createdAt])
  @@map("job_messages")
}
```

---

## 3. Duplication Audit & Verification Table

| Field / Concept | Where it Lives | Where it Was Intentionally Omitted | Reason & Formula |
| :--- | :--- | :--- | :--- |
| **Strict Regional Silos** | `CountryCode` & `CurrencyCode` enums on `User`, `Customer`, `Fleet`, `Invoice`, `Job` | Blended cross-currency conversions | *Zero Mixing:* US, CA, UK operations have independent pricing, independent currencies, and separate reporting. |
| **Driver Telemetry & Cash** | `User.currentLat`, `currentLng`, `cashInHandCents` | Separate `DriverProfile` table | *Ponytail Win:* Avoids 1:1 join table for 5 nullable columns. Proximity queries run directly against `users`. |
| **Physical Cash Audit Trail** | `DriverCashLedger` (`onDelete: Restrict`) | Only mutable `User.cashInHandCents` | Mutable integer cannot audit theft or handover deposits. Preserves immutable deposits, verifier IDs, and outlives user accounts. |
| **Work Performed Line Items** | `JobServiceItem` | In freeform notes or strings | Essential for 16-service catalog tracking and 1-click invoice generation. |
| **Customer Portal Account** | *Derived on Read* (`userId != null`) | `Customer.isUserAccountCreated` boolean | Storing a redundant boolean creates drift. Account exists if and only if `userId` is set. |
| **B2C Membership Status** | *Derived on Read* (`membershipExpiresAt > now()`) | `Customer.isMembershipActive` boolean | An active flag alongside an expiration timestamp drifts the day after expiry. |
| **B2B Contract Verification** | *Derived on Read* (`status == APPROVED`) | `Fleet.isVerified` boolean | Duplicate state: if status is `APPROVED`, fleet is verified. |
| **Public Booking Verification** | *Derived on Read* (`status != UNVERIFIED_PUBLIC`) | `Job.isVerified` boolean | Eliminates two flags for the same operational condition. |
| **Tax Exemption** | *Derived on Read* (`taxRateBps == 0`) | `Job.isTaxExempt` boolean | If tax basis points is 0 (0%), ticket is tax exempt. Zero redundant booleans. |
| **Invoice Line Item Total** | *Derived on Read* (`unitPriceCents * quantity`) | `InvoiceItem.totalCents` column | Prevents mathematical desynchronization. |
| **Total Job Expense** | *Derived on Read* (`materialCostCents + repairerFeeCents + otherExpenseCents`) | `Job.totalExpenseCents` column | Summed dynamically in SQL/queries. |
| **Net Profit / Net Margin** | *Derived on Read* (`totalCents - Total Job Expense`) | `Job.netProfitCents` column | Dynamic calculation: $\text{Customer Paid} - \text{Material} - \text{Repairer}$. |
| **Warehouse Models** | Static Config (`server/config/hubs.ts`) | Relational database table | *Ponytail Deferral:* 2 fixed regional hubs (Manassas & Mississauga) are static constants; database table deferred. |
| **Accountant JR / SR Roles** | Unified `UserRole.ACCOUNTANT` | Split `ACCOUNTANT_JR` and `ACCOUNTANT_SR` enums | *Ponytail Deferral:* Single accountant role handling intake expenses and payout approvals with permission guards. |
