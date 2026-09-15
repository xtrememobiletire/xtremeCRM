# Data Models & Schema Design — XtremeCRM

## 1. Design Principles (Zero Duplication & Integrity)
- **Zero Redundancy:** No field is stored in more than one place:
  - Tire size is stored strictly once on `Vehicle.tireSize`. `Job` references `vehicleId` and never duplicates tire size columns.
  - Customer contact details live on `Customer`. `Job` references `customerId`.
  - Service address on `Job` is the specific roadside emergency breakdown location (independent of customer profile).
- **Exact Integer Cents Storage:** Every currency field is stored as an integer in **cents** (`*_cents`). Floating-point arithmetic is strictly prohibited.
- **Computed Metrics (Derived on Read):**
  $$\text{Total Job Expense} = \text{materialCostCents (TC)} + \text{repairerFeeCents (DC)} + \text{otherExpenseCents}$$
  $$\text{Net Profit} = \text{totalCents (CP)} - \text{Total Job Expense}$$
  $$\text{Total Net After IT\_B} = \text{Net Profit} - \text{itPlatformFeeCents (IT\_B)}$$
  These metrics are derived dynamically in SQL / API queries, eliminating out-of-sync financial columns.
- **Active Accountant Job Costing:**
  - The accountant actively **states the expenses for each job** (`repairerFeeCents`, `materialCostCents`, `otherExpenseCents`, `expenseNotes`) and timestamps their entry (`expenseStatedById`, `expenseStatedAt`).
  - Payment verification is tracked via an explicit boolean flag (`isPaymentVerified`, `paymentVerifiedById`, `paymentVerifiedAt`).

---

## 2. Complete Prisma Schema (`schema.prisma`)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// --------------------------------------------------------
// ENUMS
// --------------------------------------------------------

enum UserRole {
  ADMIN
  CALL_AGENT
  DISPATCHER
  DRIVER
  ACCOUNTANT_JR
  ACCOUNTANT_SR
  VIRTUAL_ASSISTANT
}

enum JobStatus {
  PENDING
  UNVERIFIED_PUBLIC
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
}

enum PaymentStatus {
  UNPAID
  PAID_PENDING_VERIFICATION
  VERIFIED_PAID
  REFUNDED
}

enum CashTransactionType {
  JOB_COLLECTION
  DEPOSIT_HANDOVER
  ADJUSTMENT
}

// --------------------------------------------------------
// CORE ENTITIES
// --------------------------------------------------------

model User {
  id           String    @id @default(uuid())
  email        String    @unique
  passwordHash String    @map("password_hash")
  fullName     String    @map("full_name")
  role         UserRole  @default(CALL_AGENT)
  countryCode  String    @default("CA") @map("country_code") // "CA", "US", "UK"
  phone        String?

  // Agent Presence (Active / Inactive toggle)
  isAgentActive Boolean  @default(false) @map("is_agent_active")

  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  // Relations
  driverProfile        DriverProfile?
  createdJobs          Job[]                 @relation("AgentJobs")
  assignedJobs         Job[]                 @relation("DriverJobs")
  verifiedJobs         Job[]                 @relation("VerifiedJobs")
  statedJobExpenses    JobFinancial[]        @relation("ExpensesStatedBy")
  verifiedPayments     JobFinancial[]        @relation("PaymentsVerifiedBy")
  auditedFinancials    JobFinancial[]        @relation("AuditedBy")
  verifiedCashLedgers  DriverCashLedger[]    @relation("VerifiedBy")
  sourcedFleets        Fleet[]               @relation("VirtualAssistantFleets")
  fleetCommissions     FleetCommissionLedger[]
  sentMessages         JobMessage[]          @relation("SentMessages")
  customerAccount      Customer?             @relation("UserCustomer")

  @@index([countryCode, role])
  @@map("users")
}

model DriverProfile {
  id               String    @id @default(uuid())
  userId           String    @unique @map("user_id")
  user             User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  currentLat       Float?    @map("current_lat")
  currentLng       Float?    @map("current_lng")
  lastPingAt       DateTime? @map("last_ping_at")
  isOnline         Boolean   @default(false) @map("is_online")
  cashInHandCents  Int       @default(0) @map("cash_in_hand_cents")

  cashLedgers      DriverCashLedger[]

  @@map("driver_profiles")
}

model Customer {
  id                   String    @id @default(uuid())
  fullName             String    @map("full_name")
  phone                String    // Primary lookup index
  altPhone             String?   @map("alt_phone")
  email                String?
  countryCode          String    @default("CA") @map("country_code") // "CA", "US", "UK"

  // Provisioning: "After all this make user account"
  isUserAccountCreated Boolean   @default(false) @map("is_user_account_created")
  userId               String?   @unique @map("user_id")
  user                 User?     @relation("UserCustomer", fields: [userId], references: [id])

  createdAt            DateTime  @default(now()) @map("created_at")
  updatedAt            DateTime  @updatedAt @map("updated_at")

  vehicles             Vehicle[]
  jobs                 Job[]

  @@unique([countryCode, phone])
  @@index([countryCode, phone])
  @@map("customers")
}

model Vehicle {
  id          String    @id @default(uuid())
  customerId  String    @map("customer_id")
  customer    Customer  @relation(fields: [customerId], references: [id], onDelete: Cascade)
  year        Int
  make        String
  model       String
  tireSize    String    @map("tire_size") // Single source of truth (e.g. "235/45R18")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  jobs        Job[]

  @@index([customerId])
  @@map("vehicles")
}

model Fleet {
  id                 String    @id @default(uuid())
  name               String
  contactPerson      String    @map("contact_person")
  phone              String
  email              String?
  address            String?
  fleetSize          Int       @default(1) @map("fleet_size")
  countryCode        String    @default("CA") @map("country_code")

  // B2B Workflow & Verification
  contractSignedAt   DateTime? @map("contract_signed_at")
  isVerified         Boolean   @default(false) @map("is_verified")

  // Lead attribution for Virtual Assistant ($2-$3 commission)
  virtualAssistantId String?   @map("virtual_assistant_id")
  virtualAssistant   User?     @relation("VirtualAssistantFleets", fields: [virtualAssistantId], references: [id])

  createdAt          DateTime  @default(now()) @map("created_at")
  updatedAt          DateTime  @updatedAt @map("updated_at")

  jobs               Job[]
  commissions        FleetCommissionLedger[]

  @@index([countryCode, isVerified])
  @@map("fleets")
}

model FleetCommissionLedger {
  id                 String    @id @default(uuid())
  fleetId            String    @map("fleet_id")
  fleet              Fleet     @relation(fields: [fleetId], references: [id], onDelete: Cascade)
  jobId              String    @map("job_id")
  job                Job       @relation(fields: [jobId], references: [id], onDelete: Cascade)
  virtualAssistantId String    @map("virtual_assistant_id")
  virtualAssistant   User      @relation(fields: [virtualAssistantId], references: [id])
  commissionCents    Int       @default(250) @map("commission_cents") // $2.00 - $3.00 (stored in cents)
  isPaid             Boolean   @default(false) @map("is_paid")
  paidAt             DateTime? @map("paid_at")
  createdAt          DateTime  @default(now()) @map("created_at")

  @@index([virtualAssistantId, isPaid])
  @@map("fleet_commission_ledgers")
}

model ServiceCatalog {
  id                String          @id @default(uuid())
  name              String          // e.g. "Tire Repair (plug)", "Stem Valve", etc.
  category          String          // "TIRE_SERVICE", "ROADSIDE_ASSISTANCE"
  defaultPriceCents Int             @map("default_price_cents")
  countryCode       String          @default("CA") @map("country_code")
  isActive          Boolean         @default(true) @map("is_active")

  jobServiceItems   JobServiceItem[]

  @@index([countryCode, isActive])
  @@map("service_catalogs")
}

model Job {
  id               String          @id @default(uuid())
  jobCode          String          @unique @map("job_code") // e.g. "JOB-CA-10492"
  customerId       String          @map("customer_id")
  customer         Customer        @relation(fields: [customerId], references: [id])
  vehicleId        String          @map("vehicle_id")
  vehicle          Vehicle         @relation(fields: [vehicleId], references: [id])
  fleetId          String?         @map("fleet_id")
  fleet            Fleet?          @relation(fields: [fleetId], references: [id])
  driverId         String?         @map("driver_id")
  driver           User?           @relation("DriverJobs", fields: [driverId], references: [id])
  createdById      String          @map("created_by_id")
  createdBy        User            @relation("AgentJobs", fields: [createdById], references: [id])

  // Lifecycle & Priorities
  status           JobStatus       @default(PENDING)
  urgency          JobUrgency      @default(STANDARD)
  source           JobSource       @default(DIRECT_CALL)
  countryCode      String          @default("CA") @map("country_code") // "CA", "US", "UK"

  // Intake & Verification Flags
  isVerified       Boolean         @default(true) @map("is_verified") // false for landing page bookings
  verifiedById     String?         @map("verified_by_id")
  verifiedBy       User?           @relation("VerifiedJobs", fields: [verifiedById], references: [id])
  isTaxExempt      Boolean         @default(false) @map("is_tax_exempt")
  telnyxCallId     String?         @map("telnyx_call_id")

  // Roadside location
  serviceAddress   String          @map("service_address")
  serviceLat       Float           @map("service_lat")
  serviceLng       Float           @map("service_lng")
  etaMinutes       Int?            @map("eta_minutes")
  scheduledAt      DateTime?       @map("scheduled_at")
  assignedAt       DateTime?       @map("assigned_at")
  arrivedAt        DateTime?       @map("arrived_at")
  completedAt      DateTime?       @map("completed_at")

  // Call Center Outcome
  disposition      JobDisposition  @default(BOOKED)
  dispositionNotes String?         @map("disposition_notes")

  createdAt        DateTime        @default(now()) @map("created_at")
  updatedAt        DateTime        @updatedAt @map("updated_at")

  // Relations
  serviceItems     JobServiceItem[]
  financial        JobFinancial?
  messages         JobMessage[]
  fleetCommissions FleetCommissionLedger[]

  @@index([countryCode, status])
  @@index([countryCode, createdAt])
  @@index([status])
  @@index([urgency])
  @@index([driverId])
  @@index([fleetId])
  @@map("jobs")
}

model JobServiceItem {
  id               String          @id @default(uuid())
  jobId            String          @map("job_id")
  job              Job             @relation(fields: [jobId], references: [id], onDelete: Cascade)
  serviceCatalogId String          @map("service_catalog_id")
  serviceCatalog   ServiceCatalog  @relation(fields: [serviceCatalogId], references: [id])
  unitPriceCents   Int             @map("unit_price_cents")
  quantity         Int             @default(1)

  @@map("job_service_items")
}

model JobFinancial {
  id                   String        @id @default(uuid())
  jobId                String        @unique @map("job_id") // Strict 1:1 relation
  job                  Job           @relation(fields: [jobId], references: [id], onDelete: Cascade)

  currency             String        @default("CAD") // "CAD", "USD", "GBP"
  subtotalCents        Int           @map("subtotal_cents")
  taxRatePercent       Float         @map("tax_rate_percent") // e.g. 13.0 for 13%
  taxAmountCents       Int           @map("tax_amount_cents")
  totalCents           Int           @map("total_cents") // Gross Customer Paid (CP)

  paymentMethod        PaymentMethod @map("payment_method")
  paymentStatus        PaymentStatus @default(UNPAID) @map("payment_status")

  // ------------------------------------------------------
  // JOB EXPENSE STATING (Accountant explicitly inputs expenses)
  // ------------------------------------------------------
  materialCostCents    Int           @default(0) @map("material_cost_cents") // Tire & parts cost (TC)
  repairerFeeCents     Int           @default(0) @map("repairer_fee_cents")  // Repairer/technician labor (DC)
  otherExpenseCents    Int           @default(0) @map("other_expense_cents") // Incidental expenses
  expenseNotes         String?       @map("expense_notes")                   // Explanation of job expenses
  expenseStatedById    String?       @map("expense_stated_by_id")
  expenseStatedBy      User?         @relation("ExpensesStatedBy", fields: [expenseStatedById], references: [id])
  expenseStatedAt      DateTime?     @map("expense_stated_at")

  // ------------------------------------------------------
  // PAYMENT VERIFICATION
  // ------------------------------------------------------
  isPaymentVerified    Boolean       @default(false) @map("is_payment_verified")
  paymentVerifiedById  String?       @map("payment_verified_by_id")
  paymentVerifiedBy    User?         @relation("PaymentsVerifiedBy", fields: [paymentVerifiedById], references: [id])
  paymentVerifiedAt    DateTime?     @map("payment_verified_at")

  // ------------------------------------------------------
  // IT PLATFORM ROYALTY
  // ------------------------------------------------------
  itPlatformFeeCents   Int           @map("it_platform_fee_cents") // $1.50 CAD / $1.00 USD / £1.00 GBP

  // ------------------------------------------------------
  // AUDIT & RECEIPT ATTACHMENTS
  // ------------------------------------------------------
  receiptUrl           String?       @map("receipt_url")          // Customer payment proof
  materialReceiptUrl   String?       @map("material_receipt_url") // Supplier parts/tire purchase slip
  isAudited            Boolean       @default(false) @map("is_audited")
  auditedById          String?       @map("audited_by_id")
  auditedBy            User?         @relation("AuditedBy", fields: [auditedById], references: [id])
  auditedAt            DateTime?     @map("audited_at")

  createdAt            DateTime      @default(now()) @map("created_at")
  updatedAt            DateTime      @updatedAt @map("updated_at")

  @@index([currency])
  @@index([paymentStatus])
  @@index([isPaymentVerified])
  @@index([isAudited])
  @@map("job_financials")
}

model JobMessage {
  id        String   @id @default(uuid())
  jobId     String   @map("job_id")
  job       Job      @relation(fields: [jobId], references: [id], onDelete: Cascade)
  senderId  String   @map("sender_id")
  sender    User     @relation("SentMessages", fields: [senderId], references: [id])
  content   String
  createdAt DateTime @default(now()) @map("created_at")

  @@index([jobId, createdAt])
  @@map("job_messages")
}

model DriverCashLedger {
  id               String              @id @default(uuid())
  driverProfileId  String              @map("driver_profile_id")
  driverProfile    DriverProfile       @relation(fields: [driverProfileId], references: [id], onDelete: Cascade)
  amountCents      Int                 @map("amount_cents")
  type             CashTransactionType
  verifiedById     String?             @map("verified_by_id")
  verifiedBy       User?               @relation("VerifiedBy", fields: [verifiedById], references: [id])
  notes            String?
  createdAt        DateTime            @default(now()) @map("created_at")

  @@index([driverProfileId, createdAt])
  @@map("driver_cash_ledgers")
}
```

---

## 3. Duplication Audit & Verification

| Field / Concept | Where it lives | Where it was intentionally omitted | Reason |
| :--- | :--- | :--- | :--- |
| **Tire Size** | `Vehicle.tireSize` | `Job`, `Customer` | Multiple jobs for the same vehicle reuse the tire specification without re-entering or duplicating it. |
| **Customer Phone / Alt Phone** | `Customer.phone`, `Customer.altPhone` | `Job` | Single source of truth. If customer changes number, past jobs still reference the customer ID. |
| **Service Breakdown Location** | `Job.serviceAddress`, `Job.serviceLat`, `Job.serviceLng` | `Customer` | Customers call from emergency highway locations, not necessarily their home address. |
| **Job Expense Stating** | `JobFinancial.materialCostCents`, `JobFinancial.repairerFeeCents`, `JobFinancial.otherExpenseCents` | `Job`, `User` | Stated explicitly by the accountant per job. Captures exact material and repairer expenses for that ticket. |
| **Total Job Expense** | *Derived in SQL/Code* (`materialCostCents + repairerFeeCents + otherExpenseCents`) | `JobFinancial.totalExpenseCents` | Summed dynamically on read to prevent mathematical desynchronization. |
| **Net Profit / Net Margin** | *Derived in SQL/Code* (`totalCents - totalExpenseCents`) | `JobFinancial.netMarginCents` | Dynamic calculation: $\text{Customer Paid} - \text{Material Fees} - \text{Repairer Fees}$. |
| **Payment Verification** | `JobFinancial.isPaymentVerified`, `paymentVerifiedById`, `paymentVerifiedAt` | `Job` | Financial verification belongs strictly on the financial record with audit trail. |
| **Driver Cash Balance** | `DriverProfile.cashInHandCents` + `DriverCashLedger` | `User` | Only drivers hold physical cash; non-driver staff don't have empty or irrelevant columns. |
| **Country Multi-Tenancy** | `countryCode` on `User`, `Customer`, `Job`, `Fleet` | *No cloned tables* (e.g. no `CanadaJob` or `USAJob`) | Zero model duplication. Scoping is enforced via indexed `countryCode` column and Prisma Client Extensions. |
