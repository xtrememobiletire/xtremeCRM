# Engineering Rules & Guidelines — XtremeCRM

## 1. Core Philosophy (Ponytail / YAGNI)
1. **The Ladder First:**
   - Does this need to exist? If speculative $\rightarrow$ skip it.
   - Can native platform / framework do it? Use it (e.g., standard Express middleware over heavy opinionated frameworks, native HTML `<input type="date">` where appropriate).
   - Boring over clever. The shortest readable code wins.
2. **Deletion over addition:** If a feature or field has no immediate operational consumer in the workflow, do not add it.
3. **Intentional simplification:** Mark deliberate shortcuts or deferrals with `// ponytail: [rationale]` so technical debt is explicit and tracked.

---

## 2. Database & Data Model Rules (Zero Duplication & Integrity)
1. **Single Source of Truth:**
   - **NO duplicated fields across tables.** If a relationship provides access to data (e.g. `vehicle.tireSize` via `job.vehicleId`), do not replicate it on `Job`.
   - **No duplicated addresses:** A customer profile stores their default contact. `Job.serviceAddress` represents the physical roadside emergency breakdown location.
2. **Strict Money Handling & Integer Cents:**
   - Every monetary value is stored as an integer in **cents / pence** (`*_cents`). Floating-point arithmetic (`0.1 + 0.2 != 0.3`) is strictly forbidden to eliminate rounding errors.
   - For end users, dispatchers, drivers, and accountants, the UI always renders normal formatted currencies (e.g., `$160.00 CAD`, `$160.00 USD`, `£45.50 GBP`).
   - **Absolute Regional Country Silos (No Blended Revenue):**
     - Canada (CA) operates in `CAD` ($) with Canadian tax rules.
     - United States (US) operates in `USD` ($) with US tax rules.
     - United Kingdom (UK) operates in `GBP` (£) with UK VAT rules.
     - **NEVER mix, convert, or sum different currencies into a single combined/blended revenue total.** Each country maintains its own independent accounting, jobs, pricing, and revenue reports.
3. **Accountant Job Expense Stating & Margin Rules (Zero Inventory):**
   - The accountant actively **states/inputs the expenses per job** (`materialCostCents`, `repairerFeeCents`, `otherExpenseCents`, `expenseNotes`).
   - Financial fields are inlined directly onto the `Job` model (avoiding 1:1 join ceremony) with audit trail attributes (`expenseStatedById`, `expenseStatedAt`).
   - **Derived Metrics on Read:**
     $$\text{Total Job Expense} = \text{materialCostCents} + \text{repairerFeeCents} + \text{otherExpenseCents}$$
     $$\text{Net Profit} = \text{totalCents (CP)} - \text{Total Job Expense}$$
     $$\text{Total Net After IT\_B} = \text{Net Profit} - \text{itPlatformFeeCents}$$
     These are calculated dynamically on read in SQL/API queries. Never store them as redundant database columns.
4. **Payment Verification & Audit Standards:**
   - Payment verification is derived dynamically: `paymentVerifiedById != null || paymentStatus == VERIFIED_PAID`.
   - Single unified `ACCOUNTANT` role handles ticket expense stating, receipt audits, payment verification, and payout approval.
5. **Platform Royalty (`IT_B`):**
   - Stored in regional cents per completed job (`itPlatformFeeCents @default(0)`):
     - Canada: **150 cents** ($1.50 CAD)
     - USA: **100 cents** ($1.00 USD)
     - UK: **100 pence** (£1.00 GBP)

---

## 3. Express + TypeScript Architecture & Middleware Standards

### 3.1. Standard Middleware Pipeline
The Express application must register middleware in the following explicit order:
1. `helmet()` — HTTP security headers.
2. `cors({ origin, credentials: true })` — CORS with cookie support.
3. `morgan('dev')` — Request logging.
4. `express.json({ limit: '10mb' })` & `express.urlencoded({ extended: true })` — Body parsing.
5. `cookieParser(process.env.COOKIE_SECRET)` — Signed cookie extraction.
6. `passport.initialize()` — Passport authentication strategy.

### 3.2. Single-Source Schema Validation with Zod
- All request validation must use **Zod**.
- Infer TypeScript types directly from schemas without duplicating TypeScript interfaces:
  ```typescript
  import { z } from 'zod';

  export const StateJobExpensesSchema = z.object({
    materialCostCents: z.number().int().nonnegative({ message: 'Material cost must be >= 0 cents' }),
    repairerFeeCents: z.number().int().nonnegative({ message: 'Repairer fee must be >= 0 cents' }),
    otherExpenseCents: z.number().int().nonnegative().optional().default(0),
    expenseNotes: z.string().max(500).optional(),
  });

  export type StateJobExpensesInput = z.infer<typeof StateJobExpensesSchema>;
  ```
- Use a standard `validateRequest(schema)` middleware wrapper:
  ```typescript
  export const validateRequest = (schema: z.ZodSchema) => {
    return (req: Request, res: Response, next: NextFunction) => {
      const result = schema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          success: false,
          errors: result.error.flatten().fieldErrors,
        });
      }
      req.body = result.data;
      next();
    };
  };
  ```

### 3.3. Authentication with Passport & Bcrypt
- **Passport-JWT:** Strategy extracts JWT from HttpOnly cookies (or `Authorization: Bearer` header for mobile drivers).
- **Bcrypt:** Passwords hashed with `bcrypt.hash(password, 10)` before persistence; verified via `bcrypt.compare()`.
- **Role-Based Guards:** `authorizeRoles('ADMIN', 'ACCOUNTANT')` middleware for sensitive endpoints.

### 3.4. File & Receipt Uploads with Multer
- Use `multer` for multi-part file uploads (customer payment slips, supplier wholesale tire invoices, driver cash deposit receipts).
- Enforce strict size limits ($\le 5\text{MB}$) and MIME-type restrictions (`image/jpeg`, `image/png`, `image/webp`, `application/pdf`).
- Organize uploads into distinct subfolders (`/uploads/receipts/customer`, `/uploads/receipts/materials`).

### 3.5. Centralized Error Handling
- Catch-all Express error handler `(err, req, res, next)` converts unexpected exceptions and Prisma errors into predictable JSON responses:
  ```typescript
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
  ```

---

## 4. Frontend Architecture, Naming & State Management Rules

### 4.1. Structure & Naming Conventions
1. **Case Discipline:**
   - Directories: `camelCase` (e.g. `src/components/pages/dispatch/`, `src/components/pages/fleets/`, `src/components/pages/accounting/`).
   - Utilities, hooks, stores: `camelCase` (e.g. `useAuth.ts`, `useJobDetails.ts`, `currencyUtils.ts`).
   - Page Components: `PascalCase` ONLY for top-level routes in `src/pages/` (e.g. `src/pages/Dispatch.tsx`, `src/pages/Fleets.tsx`, `src/pages/Accounting.tsx`).
2. **Dynamic Folder Mirroring:**
   - Every page in `src/pages/[PageName].tsx` must have an exact matching folder in `src/components/pages/[pageName]/` containing its dedicated sub-components (e.g. `src/pages/Accounting.tsx` $\rightarrow$ `src/components/pages/accounting/ExpenseModal.tsx`, `src/components/pages/accounting/ReconciliationTable.tsx`).
   - Common shared UI elements live in `src/components/ui/` (`button.tsx`, `modal.tsx`, `card.tsx`, `dataTable.tsx`).
3. **Strict Page Line Ceilings:**
   - Target **~100 lines**, hard ceiling of **150 lines**. Pages act purely as orchestrators connecting data queries with child view components.
4. **Tailwind Class Deduplication:**
   - Avoid long repetitive className strings in JSX. Extract shared components or use `@layer components` with `@apply` inside CSS.

### 4.2. State Management & Hook Guidelines
1. **Keep State Local First:** Always define your `useState` or `useReducer` hooks in the lowest possible component that needs that data. Don't lift it up unless necessary.
2. **Lift State Up for Siblings:** If Component A and Component B both need to share the same state, move the hook up into their closest common parent component, then pass the state down via props.
3. **Use Context / Global Store for Deep Nesting:** If your data needs to be accessed by components nested 4 or 5 levels deep, use global Zustand store or React Context to pull data directly without prop drilling.
4. **Use Custom Hooks for Logic:** Extract reusable data fetching or lifecycle logic into custom hooks (`useJobs.ts`, `useBookings.ts`, `useSSE.ts`).

### 4.3. Anti-Pattern Prohibition: Cache Storage in sessionStorage is Strictly Forbidden
1. **Never Persist Query Cache to Web Storage:**
   - Writing TanStack Query caches, job records, or customer profiles to `sessionStorage` or `localStorage` is **strictly prohibited**.
   - `sessionStorage` is partitioned per tab; writing cache data to `sessionStorage` causes immediate multi-tab data desynchronization and stale reads across browser windows.
   - Synchronous `JSON.stringify` and `JSON.parse` operations degrade performance on high-frequency dispatch grids.
2. **Pure In-Memory State Discipline:**
   - All server data must reside strictly in-memory within TanStack Query (`queryClient`).
   - All transient UI states (active modal, open drawer, filters) must reside strictly in Zustand or local React state.
   - Cache synchronization between clients is driven exclusively by Server-Sent Events (SSE) triggering `queryClient.invalidateQueries()`.

### 4.4. Frontend Server-Sent Events (SSE) Consumer Rules
1. **Connection Singleton:** Maintain a single active `EventSource` connection per authenticated user managed via `SSEProvider`.
2. **Granular Query Invalidation:** SSE event listeners must only invalidate specific query keys matching the event payload (e.g., `job:status_updated` invalidates `['jobs']`, `['fleet-jobs']`, and `['job', id]`; never call `queryClient.invalidateQueries()` without key filters).
3. **Resilience & Cleanup:** Clean up event listeners and close `EventSource` upon unmount or user logout (`eventSource.close()`).

---

## 5. Dokploy Deployment & Multi-Tenant Query Scoping
1. **Single Database Multi-Tenancy:**
   - Single PostgreSQL database container in Dokploy.
   - Tenant isolation enforced by `countryCode` on `User`, `Customer`, `Job`, and `Fleet`.
2. **Express Tenant Middleware & Prisma Client Extensions:**
   - Express middleware sets `req.countryCode` from the authenticated user's session or `X-Region` header.
   - Prisma Client Extension auto-injects `countryCode`:
     - Reads (`findMany`, `findFirst`): automatically appends `{ where: { countryCode: req.countryCode } }`.
     - Writes (`create`, `createMany`): automatically sets `{ countryCode: req.countryCode }`.
3. **Director & Regional Reporting (Zero Blended Revenue):**
   - Admin and Accountant roles view metrics strictly partitioned by country.
   - When viewing multiple regions in administrative dashboards, metrics are strictly displayed side-by-side in separate regional cards (Canada in CAD, US in USD, UK in GBP). Under no circumstances are cross-currency totals or blended revenues computed. Each country functions as an independent business silo.

---

## 6. Telephony Delegation, Route Segmentation & Mapbox Dispatch

### 6.1. External Dialer Delegation & Telnyx Code Preservation
1. **External Telephony Delegation:**
   - Active voice routing, external softphones, call queues, and automated outbound dialing are handled via the external partner dialer platform during current operations.
2. **Telnyx Dialer Code Preservation:**
   - The native Telnyx softphone implementation, `@telnyx/webrtc` client integrations, and backend token/call-control controllers (`telnyxService.ts`, `telephonyController.ts`) MUST NOT be deleted.
   - All Telnyx telephony code is **fully preserved and retained** under a dormant feature flag (`ENABLE_TELNYX_SOFTPHONE=false`) for seamless direct re-activation in future phases.
3. **CRM Operational Focus:**
   - The CRM focuses on high-performance CRUD operations for job lifecycles, account management, dispatch optimization, fleet operations, and VA outbound callback queues without runtime telephony audio overhead.
   - Call outcome dispositions and notes are logged in CRM intake modals and lead cards for audit and reporting.

### 6.2. Route & View Segmentation Standards
1. **Standard Jobs Route (`/jobs`):** Manages walk-in and retail motorists. Standard retail price cards and standard dispatch workflows.
2. **Fleet Jobs Route (`/fleet-jobs`):** Manages commercial accounts. Auto-enforces contracted tier pricing matrixes, SLA timers, and certified driver filtering.
3. **Web Bookings Route (`/bookings`):** Isolated staging queue for unverified public web submissions. Must NEVER mix with active operational grids until verified.

### 6.3. Web Booking Verification Pipeline Rules
1. **Mandatory 3-Stage Lifecycle:** Ingress (`/bookings`) $\rightarrow$ Verification Review $\rightarrow$ Active Job Transition.
2. **Validation Integrity:** Dispatchers must verify contact phone number, confirm address geocoding via Mapbox, and validate service compatibility before approving.
3. **No Direct Creation:** Public web submissions cannot directly enter `/jobs` or `/fleet-jobs` without dispatcher verification approval.

### 6.4. Mapbox Proximity Engine Standards
1. **No Continuous GPS Tracking:** Continuous background GPS tracking of driver devices is strictly prohibited to preserve battery life and mobile bandwidth.
2. **Single-View Snapshot Calculation:** Proximity and travel duration are evaluated as a single-view snapshot upon opening the job assignment panel using Mapbox Matrix API and Directions API with live traffic layers.
3. **Address Resolution:** Customer addresses must be validated and geocoded into precise coordinates via Mapbox Geocoding Autocomplete during intake and verification.

### 6.5. Server-Sent Events (SSE) Protocol Standards
1. **Unidirectional HTTP Streaming:** Real-time push notifications and data change events are transmitted exclusively via SSE (`GET /api/events/stream`).
2. **Regional Partitioning:** Events are routed by `countryCode` (`CA`, `US`, `UK`) to ensure absolute regional data isolation.
3. **Heartbeat Requirement:** Server must emit a `:keepalive` comment every 20 seconds.

### 6.6. Driver Financial Isolation
1. **Strict Payload Isolation:** Drivers can only see their own assigned jobs and their own Gross and Net earnings.
2. **Omission of Margins:** Drivers have zero access to company net profit margins, wholesale material costs, or other drivers' payouts.

### 6.7. Virtual Assistant Commission Tracking
1. **Fleet Commission Attribution:** When a fleet job reaches `COMPLETED`, system checks if the fleet is linked to a `virtualAssistantId`.
2. **Immutable Ledger Entry:** If linked, an entry is inserted into `FleetCommissionLedger` with the agreed commission amount ($2.00–$3.00, stored in integer cents).
