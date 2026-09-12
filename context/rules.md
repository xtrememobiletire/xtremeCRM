# Engineering Rules & Guidelines — XtremeCRM

## 1. Core Philosophy (Ponytail / YAGNI)
1. **The Ladder First:**
   - Does this need to exist? If speculative $\rightarrow$ skip it.
   - Can native platform / framework do it? Use it (e.g., native Fastify plugins over third-party middleware, native HTML `<input type="date">` where appropriate).
   - Boring over clever. The shortest readable code wins.
2. **Deletion over addition:** If a feature or field has no immediate operational consumer in the workflow, do not add it.
3. **Intentional simplification:** Mark deliberate shortcuts or deferrals with `// ponytail: [rationale]` so debt is explicit and tracked.

---

## 2. Database & Data Model Rules (Zero Duplication)
1. **Single Source of Truth:**
   - **NO duplicated fields across tables.** If a relationship provides access to data (e.g. `vehicle.tire_size` via `job.vehicle_id`), do not replicate it on `Job`.
   - **No duplicated addresses:** A customer profile stores their home/billing contact. The `Job.service_address` represents the physical roadside breakdown location.
2. **Strict Money Handling & Currency Bucketing:**
   - Every monetary value is stored as an integer in **cents** (`amount_cents`). Floating-point money is strictly forbidden.
   - Always pair financial fields with their currency: `CAD`, `USD`, or `GBP`.
   - **Never blend different currencies into one sum:** When viewing "All Regions / Global" in the admin panel, never mathematically sum `USD + CAD + GBP`. Always group by currency (`GROUP BY currency`) and display side-by-side metric cards.
3. **Derived Values vs Stored Values:**
   - **Derive on read when simple:** $\text{Net Margin} = \text{Customer Paid} - \text{Tire Cost} - \text{Driver Cost}$.
   - Store historical snapshots only when financial locking is required (e.g., closed invoices must not change if future service catalog prices update).
4. **Soft Delete vs Hard Delete:**
   - Core financial and job data is **never hard-deleted**. Use `status = CANCELLED` or an `is_active` flag.

---

## 3. Backend (Fastify + Prisma) Rules
1. **Fastify Plugin Architecture:**
   - Encapsulate features in Fastify plugins (`/routes/jobs`, `/routes/dispatch`, `/routes/customers`, `/routes/finance`).
   - Use Fastify's built-in JSON schema validation for all request bodies and query parameters.
2. **Prisma Usage:**
   - Prefer Prisma transactions (`prisma.$transaction`) for multi-step mutations (e.g., creating Customer + Vehicle + Job in one atomic intake action).
   - Select only needed fields (`select: { id: true, status: true, ... }`) on high-traffic queries like the live dispatch board.
3. **Real-time (Socket.io) Discipline:**
   - Target events strictly to rooms (`dispatch:{region}`, `driver:{driverId}`, `job:{jobId}`).
   - Never broadcast whole database rows to public channels. Send event descriptors: `{ event: 'JOB_STATUS_CHANGED', jobId, newStatus, timestamp }`.
4. **Error Handling:**
   - Unified error response envelope:
     ```json
     { "success": false, "error": { "code": "NOT_FOUND", "message": "Job not found" } }
     ```

---

## 4. Frontend Architecture, Naming & Structure Rules

### 4.1. Strict Naming Conventions
1. **camelCase Everywhere (Default):**
   - **All functions, all utility files, and all folder names** must strictly be `camelCase`.
   - Examples: `formatCurrency.ts`, `useDispatch.ts`, `jobService.ts`, `folderName/`.
2. **PascalCase ONLY for Page Files & Components:**
   - Files in `src/pages/` must start with an uppercase letter (`PascalCase`):
     - `src/pages/LandingPage.tsx` (the root route `/` always renders the landing page).
     - `src/pages/Dashboard.tsx`
     - `src/pages/Dispatch.tsx`
     - `src/pages/Driver.tsx`
     - `src/pages/Accounting.tsx`

### 4.2. Folder Mimicking & Component Architecture
1. **Dynamic Page-to-Component Mimicking (Universal Rule):**
   - For **every single page** created in `src/pages/`, there must be an exact matching folder created in `src/components/pages/` formatted in `camelCase`.
   - The list of pages below is **strictly illustrative and non-exhaustive** — whether the application has 5, 20, or 50+ pages (e.g. `LandingPage`, `Dashboard`, `Dispatch`, `Driver`, `Accounting`, `Customers`, `Vehicles`, `Inventory`, `PricingMatrix`, `DriverPayouts`, `AuditLogs`, `Settings`), the mirroring rule applies dynamically and without exception:
     - `src/pages/LandingPage.tsx` $\longrightarrow$ `src/components/pages/landingPage/`
     - `src/pages/Dashboard.tsx` $\longrightarrow$ `src/components/pages/dashboard/`
     - `src/pages/Dispatch.tsx` $\longrightarrow$ `src/components/pages/dispatch/`
     - `src/pages/Driver.tsx` $\longrightarrow$ `src/components/pages/driver/`
     - `src/pages/Accounting.tsx` $\longrightarrow$ `src/components/pages/accounting/`
     - `src/pages/Customers.tsx` $\longrightarrow$ `src/components/pages/customers/`
     - `src/pages/Vehicles.tsx` $\longrightarrow$ `src/components/pages/vehicles/`
     - `src/pages/Settings.tsx` $\longrightarrow$ `src/components/pages/settings/`
   - If there are $N$ pages in `src/pages/`, there must be exactly $N$ matching `camelCase` folders in `src/components/pages/`.
2. **Shared Reusable Primitives (`src/components/ui/`):**
   - Any component reused across multiple pages or features lives in `src/components/ui/` (e.g. `button.tsx`, `modal.tsx`, `card.tsx`, `badge.tsx`, `input.tsx`, `dropdown.tsx`, `dataTable.tsx`, `formField.tsx`). Never duplicate UI elements across page folders.

### 4.3. Strict Page Line-Count Limits (Target ~100 Lines, Max 150 Lines)
1. **Orchestrator Role:**
   - Page files in `src/pages/` are strictly **orchestrators/conductors**, not monolithic code dumps.
   - Target line count: **~100 lines of code**.
   - **Hard Ceiling: 150 lines maximum.** Never allow 200 or 300 lines in a page file!
2. **Decomposition:**
   - If a page grows past 100 lines, break sections, tables, filters, and modals into their dedicated `src/components/pages/[pageName]/` folder immediately.

### 4.4. Tailwind CSS Deduplication (`@layer components`)
To eliminate repetitive Tailwind class spaghetti in JSX, use Tailwind's `@layer components` with `@apply` inside `src/index.css`:
```css
@layer components {
  /* Buttons */
  .btn-primary {
    @apply inline-flex items-center justify-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50;
  }
  .btn-secondary {
    @apply inline-flex items-center justify-center px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-medium border border-slate-300 rounded-lg shadow-sm transition-colors;
  }
  
  /* Containers & Surfaces */
  .card-base {
    @apply bg-white border border-slate-200 rounded-xl shadow-sm p-4;
  }
  
  /* Inputs */
  .input-base {
    @apply w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors;
  }
  
  /* Badges */
  .badge-urgent {
    @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-300;
  }
  .badge-standard {
    @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200;
  }
}
```
* In JSX, write `<button className="btn-primary">Submit</button>` instead of 25 repeated Tailwind utility classes.

### 4.5. Senior Developer Code-Reduction Suggestions (Ponytail Principles)
1. **Custom Query/Mutation Hooks (`useDispatch`, `useJobs`, `useFinance`):**
   - Extract all `useQuery` and `useMutation` calls out of page components.
   - The page simply calls: `const { jobs, assignDriver } = useDispatch();`. This cuts 40–50 lines of query boilerplate per page.
2. **Unified `<FormField />` Wrapper:**
   - Create a reusable `FormField.tsx` in `components/ui/` that wraps `<label>`, `<input>`, and `<p className="text-red-500">{error}</p>`.
   - Saves 10–15 lines of repetitive JSX per input in booking and accounting forms.
3. **Reusable `<DataTable />` Primitive:**
   - Build one generic `<DataTable columns={...} data={...} />` in `components/ui/dataTable.tsx`.
   - Avoid hand-coding `<table><thead><tr><th>...<tbody><tr><td>` across 5 different pages.
4. **Zustand Modal Slices (Zero Prop-Drilling):**
   - Avoid passing `isOpen`, `setIsOpen`, `selectedJob` down through 4 component layers.
   - Use `const openModal = useUiStore(s => s.openModal);` directly in child triggers. Cuts 30% of boilerplate code.

## 5. Security & Role-Based Access Control (RBAC)
1. **Roles Hierarchy:**
   - `ADMIN`: Full system access, company financials, user management.
   - `CALL_AGENT`: Can create/edit jobs, customers, vehicles, dispositions. No driver payouts or accountant audit access.
   - `DISPATCHER`: Can assign drivers, track fleet location, update ETAs, monitor cash collections.
   - `DRIVER`: Can only view assigned jobs, update execution status (`EN_ROUTE`, `ARRIVED`, `COMPLETED`), log collected cash.
   - `ACCOUNTANT_JR`: Can view completed jobs, verify attached receipts, log material costs.
   - `ACCOUNTANT_SR`: Can approve driver payouts, edit financial adjustments, export monthly reports.
2. **Financial Lockout:**
   - Once a job is marked `AUDITED` by an Accountant, its financial values become immutable to Call Agents and Dispatchers.

---

## 6. Clean Multi-Tenancy Architecture (Dokploy + Single DB with countryCode Scoping)
1. **Single Managed Database in Dokploy:**
   - Deployed as a single PostgreSQL service in Dokploy with automated 1-click backups.
   - Exactly **ONE** connection string: `DATABASE_URL`.
2. **Zero Model Duplication (Strict Anti-Pattern Prohibition):**
   - **NEVER clone models or create country-specific tables** (e.g. no `CanadaUser`, `USAUser`, or company-prefixed tables).
   - Exactly **ONE** model per entity: `User`, `Customer`, `Vehicle`, `Job`, `JobFinancial`.
3. **Indexed `countryCode` Scoping:**
   - Every country-scoped entity has `countryCode String @map("country_code")` with composite indexes (e.g. `@@index([countryCode, status])`, `@@index([countryCode, phone])`).
4. **Automated Prisma Client Extension (`server/lib/tenant-db.ts`):**
   - Fastify wraps Prisma with `prisma.$extends` to automatically inject `countryCode` into queries based on the `X-Region` request header or authenticated user's country:
     - On read (`findMany`, `findFirst`): automatically appends `{ countryCode: req.countryCode }`.
     - On write (`create`, `createMany`): automatically sets `{ countryCode: req.countryCode }`.
   - Route handlers write standard Prisma calls without manual `where` clauses.
5. **Director & Global Cross-Country Reporting:**
   - Role `ADMIN` and `ACCOUNTANT_SR` have access to the raw Prisma client to perform cross-country aggregations (e.g. global gross revenue, total global $IT\_B$ platform royalties).
6. **Zero-Overhead Country Expansion:**
   - Adding a new country (e.g. Australia `AU`) requires **zero database provisioning, zero containers, and zero schema migrations**.
   - Simply declare the country in `server/config/regions.ts`. Fastify and React pick it up instantly.

## 7. Decoupled Telephony (Independent Manual Agent Workflow)
1. **Zero Dialer Coupling:**
   - The CRM is 100% standalone and decoupled from the dialer. The dialer does NOT make the CRM behave differently, and no external telephony webhooks drive CRM state.
2. **No Automated Pop-Ups or Interruptions:**
   - The CRM never interrupts agents with unexpected pop-ups or modal triggers when a call rings. Agents manually open the Call Intake modal when taking a call.
3. **Manual Intake Data Flow:**
   - As designed in the original system workflow, agents manually select the source from the dropdown (`Direct Call`, `WhatsApp`, `Website`).
   - Agents manually enter or look up customer phone numbers, enter vehicle details, select services, and dispatch drivers.
4. **Resilience & Simplicity (Ponytail Principle):**
   - Telephony outages or dialer changes have zero impact on CRM performance, database integrity, or uptime. Less engineering overhead, zero unrequested complexity.
