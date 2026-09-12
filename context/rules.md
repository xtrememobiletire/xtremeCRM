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

## 4. Frontend (React + Zustand + TanStack Query) Rules
1. **Clear State Separation:**
   - **TanStack Query:** Handles ALL server data (fetching, caching, mutations, cache invalidation on socket events).
   - **Zustand:** Handles ONLY local ephemeral UI state (sidebar open/close, active filter tabs, dialer keypad drawer, selected job on map).
   - Never mirror TanStack Query server data into Zustand.
2. **Socket Sync Pattern:**
   - When a Socket.io event arrives (e.g. `JOB_UPDATED`), invalidate the corresponding TanStack Query key (`queryClient.invalidateQueries({ queryKey: ['jobs'] })`).
3. **Form Handling:**
   - Use uncontrolled inputs with `react-hook-form` + `zod` for zero-lag high-speed call intake.
   - Optimize for rapid keyboard navigation (Tab through Phone $\rightarrow$ Name $\rightarrow$ Address $\rightarrow$ Vehicle $\rightarrow$ Tire Size $\rightarrow$ Submit).

---

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

---

## 7. Zadarma Telephony & Webhook Integration Rules
1. **Zero Voice Audio in Fastify:**
   - Fastify handles only JSON events (`POST /api/telephony/zadarma-webhook`). Audio RTP streams travel directly between Zadarma and the agent's headset (via webphone or softphone). Fastify never touches audio streams.
2. **Fast Webhook Acknowledgement (< 2s):**
   - The Zadarma webhook endpoint must respond with HTTP `200 OK` (`{"result": 1}`) immediately. Customer lookups and Socket.io event emissions must run asynchronously without delaying the HTTP response.
3. **Extension-to-User Mapping:**
   - The `User` model stores `telephonyExtension` (e.g. `"101"`). When Zadarma sends `NOTIFY_INTERNAL` with an extension, Fastify routes the screen-pop event strictly to that agent's socket room (`agent:101`).
4. **Call Recording Audit Trail:**
   - On `NOTIFY_END`, Zadarma's MP3 recording URL is saved to the related `Job` audit history for dispute resolution and quality assurance.
5. **Zero Raw WebRTC Engineering:**
   - Never write custom WebRTC peer connections or ICE servers. Use Zadarma's ready-to-use webphone widget or external SIP softphones (MicroSIP/Zoiper).
