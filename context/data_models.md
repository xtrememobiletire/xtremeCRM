# Data Models & Schema Design — XtremeCRM

## 1. Design Principles (Zero Duplication & Integrity)
- **Zero Redundancy:** No field is stored in more than one place. For example:
  - Tire size is stored once on `Vehicle`. A `Job` references `vehicle_id` and never duplicates tire size.
  - Customer contact is on `Customer`. `Job` references `customer_id`.
  - Service address on `Job` is the specific roadside emergency location (independent of customer profile).
- **Exact Money Storage:** Every currency field is stored as an integer in **cents** (`*_cents`). No floating point rounding bugs.
- **Computed Metrics (Derived on Read):**
  $$\text{Net Profit} = \text{total\_cents} - \text{tire\_material\_cost\_cents} - \text{driver\_payout\_cents}$$
  This is derived dynamically in queries, eliminating out-of-sync financial columns.

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
}

// Note: Region and Currency are represented as Strings (e.g. "CA", "CAD")
// validated by server/config/regions.ts so adding new countries requires ZERO schema migrations!

enum JobUrgency {
  URGENT
  STANDARD
  FUTURE
}

enum JobSource {
  DIRECT_CALL
  WHATSAPP
  WEBSITE
}

enum JobStatus {
  PENDING
  ASSIGNED
  EN_ROUTE
  ARRIVED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

enum JobDisposition {
  BOOKED
  RELEVANT_NOT_CONVERTED // RNC
  WRONG_NUMBER           // WN
  IRRELEVANT_SERVICE     // IR
  CANCELLED_BY_CUSTOMER  // CX
}

enum PaymentMethod {
  E_TRANSFER
  POS
  CASH
  MOTO
}

enum PaymentStatus {
  UNPAID
  PAID
  VERIFIED
}

enum CashTransactionType {
  COLLECTED_FROM_CUSTOMER
  REMITTED_TO_COMPANY
}

// --------------------------------------------------------
// CORE MODELS
// --------------------------------------------------------

model User {
  id                 String    @id @default(uuid())
  email              String    @unique
  passwordHash       String    @map("password_hash")
  fullName           String    @map("full_name")
  phone              String?
  role               UserRole
  countryCode        String?   @map("country_code") // e.g. "CA", "US", "UK". Null = Global Director/Admin
  isActive           Boolean   @default(true) @map("is_active")
  createdAt          DateTime  @default(now()) @map("created_at")
  updated_at         DateTime  @updatedAt @map("updated_at")

  // Relations
  driverProfile         DriverProfile?
  createdJobs           Job[]                   @relation("AgentJobs")
  assignedJobs          Job[]                   @relation("DriverJobs")
  auditedFinancials     JobFinancial[]          @relation("AuditedBy")
  verifiedCashLedgers   DriverCashLedger[]      @relation("VerifiedBy")

  @@index([countryCode])
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
  id          String    @id @default(uuid())
  fullName    String    @map("full_name")
  phone       String    // Primary index for instant caller ID lookup
  altPhone    String?   @map("alt_phone")
  email       String?
  countryCode String    @default("CA") @map("country_code") // e.g. "CA", "US", "UK"
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  vehicles   Vehicle[]
  jobs       Job[]

  @@unique([countryCode, phone]) // Phone is unique within a country
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
  tireSize    String    @map("tire_size") // e.g. "235/45R18"
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  jobs        Job[]

  @@index([customerId])
  @@map("vehicles")
}

model ServiceCatalog {
  id              String           @id @default(uuid())
  name            String           // e.g. "Tire Repair (Plug)", "Tire Swap (ON RIM)"
  basePriceCents  Int              @map("base_price_cents")
  currency        String           @default("CAD") // e.g. "CAD", "USD", "GBP"
  countryCode     String           @default("CA") @map("country_code") // e.g. "CA", "US", "UK"
  isActive        Boolean          @default(true) @map("is_active")

  jobServiceItems JobServiceItem[]

  @@map("service_catalog")
}

model Job {
  id               String          @id @default(uuid())
  jobNumber        String          @unique @map("job_number") // Sequential: e.g. "JOB-10024"
  customerId       String          @map("customer_id")
  customer         Customer        @relation(fields: [customerId], references: [id])
  vehicleId        String          @map("vehicle_id")
  vehicle          Vehicle         @relation(fields: [vehicleId], references: [id])
  driverId         String?         @map("driver_id")
  driver           User?           @relation("DriverJobs", fields: [driverId], references: [id])
  createdById      String          @map("created_by_id")
  createdBy        User            @relation("AgentJobs", fields: [createdById], references: [id])

  status           JobStatus       @default(PENDING)
  urgency          JobUrgency      @default(STANDARD)
  source           JobSource       @default(DIRECT_CALL)
  countryCode      String          @default("CA") @map("country_code") // "CA", "US", "UK"

  // Location details (roadside location)
  serviceAddress   String          @map("service_address")
  serviceLat       Float           @map("service_lat")
  serviceLng       Float           @map("service_lng")
  etaMinutes       Int?            @map("eta_minutes") // Manual agent ETA or Maps estimated
  scheduledAt      DateTime?       @map("scheduled_at") // For FUTURE bookings
  completedAt      DateTime?       @map("completed_at")

  // Call Center Outcome
  disposition      JobDisposition  @default(BOOKED)
  dispositionNotes String?         @map("disposition_notes")

  createdAt        DateTime        @default(now()) @map("created_at")
  updatedAt        DateTime        @updatedAt @map("updated_at")

  // Relations
  serviceItems     JobServiceItem[]
  financial        JobFinancial?

  @@index([countryCode, status])
  @@index([countryCode, createdAt])
  @@index([status])
  @@index([urgency])
  @@index([driverId])
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

  currency             String        @default("CAD") // "CAD", "USD", "GBP", "AUD"
  subtotalCents        Int           @map("subtotal_cents")
  taxRatePercent       Float         @map("tax_rate_percent") // e.g. 13.0 for 13%
  taxAmountCents       Int           @map("tax_amount_cents")
  totalCents           Int           @map("total_cents") // Gross Customer Paid (CP)

  paymentMethod        PaymentMethod @map("payment_method")
  paymentStatus        PaymentStatus @default(UNPAID) @map("payment_status")

  // Cost Accounting (Net = CP - TC - DC)
  tireMaterialCostCents Int          @default(0) @map("tire_material_cost_cents") // TC
  driverPayoutCents    Int           @default(0) @map("driver_payout_cents")       // DC
  itPlatformFeeCents   Int           @map("it_platform_fee_cents")                // IT_B ($1.50 CAD / $1.00 USD / £1.00 GBP)

  // Auditing
  receiptUrl           String?       @map("receipt_url")
  auditedById          String?       @map("audited_by_id")
  auditedBy            User?         @relation("AuditedBy", fields: [auditedById], references: [id])
  auditedAt            DateTime?     @map("audited_at")

  createdAt            DateTime      @default(now()) @map("created_at")
  updatedAt            DateTime      @updatedAt @map("updated_at")

  @@index([currency])
  @@index([paymentStatus])
  @@map("job_financials")
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

  @@map("driver_cash_ledgers")
}
```

---

## 3. Duplication Audit & Verification
| Field / Concept | Where it lives | Where it was intentionally omitted | Reason |
| :--- | :--- | :--- | :--- |
| **Tire Size** | `Vehicle.tireSize` | `Job`, `Customer` | Multiple jobs for the same vehicle reuse the tire size without re-entering or duplicating it. |
| **Customer Phone / Alt Phone** | `Customer.phone` | `Job` | Single source of truth. If customer changes number, past jobs still reference the customer ID. |
| **Service Breakdown Location** | `Job.serviceAddress` | `Customer` | Customers call from emergency highway locations, not necessarily their home address. |
| **Net Margin** | *Derived in SQL/Code* | `JobFinancial.netMarginCents` | $\text{total\_cents} - \text{tire\_material\_cost\_cents} - \text{driver\_payout\_cents}$ is calculated dynamically to prevent data desynchronization. |
| **Driver Cash Balance** | `DriverProfile.cashInHandCents` + `DriverCashLedger` | `User` | Only drivers hold physical cash; non-driver staff don't have empty or irrelevant columns. |
| **Country Multi-Tenancy** | `countryCode` on `User`, `Customer`, `Job` | *No cloned tables* (e.g. no `CanadaUser` or `USAJob`) | Zero model duplication. Scoping is enforced via indexed `countryCode` column and Prisma Client Extensions. |
