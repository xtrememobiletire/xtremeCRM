---
name: realtime-system-architecture
description: >
  Production-grade architectural blueprint for building, auditing, and hardening
  real-time multi-tenant web applications, CRMs, and dispatch engines. Contains
  comprehensive positive and negative prompts covering dual-transport synchronization
  (SSE vs. WebSockets), in-memory cache consistency (TanStack Query/SWR), atomic queue
  locking (SKIP LOCKED), multi-tenant RBAC, and clean external protocol boundaries.
---

# Real-Time System & Multi-Tenant Application Architecture

A comprehensive, technology-agnostic architectural standard for engineering high-concurrency, multi-tenant web applications, CRMs, and real-time operational platforms.

---

## 1. Real-Time Transport: WebSockets vs. Server-Sent Events (SSE)

### Positive Strategies (DO)
- **Assign Dedicated Responsibilities to Each Transport**:
  - **WebSockets**: Use exclusively for bidirectional, low-latency, full-duplex communication:
    - WebRTC signaling and call state negotiation.
    - Real-time peer-to-peer or operator-to-agent chat.
    - High-frequency telemetry (live GPS tracking, typing indicators, presence pings).
  - **Server-Sent Events (SSE)**: Use for unidirectional server-to-client data streaming:
    - Entity updates (`order:created`, `lead:status_updated`, `task:assigned`).
    - Cache invalidation and optimistic synchronization pings.
    - Long-running background job progress indicators.
- **Implement Heartbeats & Resumption**:
  - Transmit periodic `:keepalive\n\n` comments (every 15–20s) over SSE to prevent reverse-proxy timeouts (NGINX, Cloudflare, Traefik, AWS ALB).
  - Maintain a bounded server-side ring buffer (e.g., 200–500 events) indexed by an incrementing event ID (`id: evt_123`).
  - Read `Last-Event-ID` on reconnection and replay missed events.
- **Enforce Connection Authentication During Handshake**:
  - Authenticate WebSocket connections in the handshake middleware (e.g. `io.use()`) using HTTP-only cookies or short-lived handshake tokens.
  - Derive client identity and tenant scope directly from the validated token claims on the server—never trust client-asserted roles or IDs.

### Negative Anti-Patterns (DO NOT)
- **DO NOT Run Competing Duplicate Cache Invalidations**:
  - Never broadcast the same entity invalidation over both WebSockets and SSE simultaneously. This triggers duplicate HTTP GET refetch cascades and race conditions where network responses overwrite in-memory state.
- **DO NOT Trust Client-Asserted Authentication Over Sockets**:
  - Never allow an unauthenticated socket to connect and subsequently emit `auth:register` with arbitrary client payloads (e.g., `{ role: 'ADMIN', tenantId: '123' }`).
- **DO NOT Pass Long-Lived JWT Bearer Tokens in URL Query Parameters**:
  - Never configure SSE as `EventSource('/api/events?token=' + jwt)`. Query strings are recorded in plaintext in access logs, proxy logs, CDN traces, and browser history. Use HTTP-only cookies (`withCredentials: true`) or single-use, 30-second ticket tokens.
- **DO NOT Broadcast Global Events Without Tenant/Role Partitioning**:
  - Never broadcast operational feeds across a country/region channel without verifying client roles on the server. External drivers, vendors, or customers must never receive unscrubbed administrative channels.

---

## 2. Client-Side In-Memory Cache Synchronization

### Positive Strategies (DO)
- **Direct Surgical Mutation for Single Entity Updates (`setQueryData`)**:
  - When the server broadcasts an entity payload (`lead:updated`, `job:status_updated`), surgically patch the in-memory cache directly:
    ```ts
    queryClient.setQueriesData({ queryKey: ['orders', tenantId] }, (old: any) => {
      if (!old) return old;
      const list = Array.isArray(old) ? old : old.data;
      if (!Array.isArray(list)) return old;
      const updated = list.map((item: any) => item.id === payload.id ? { ...item, ...payload } : item);
      return Array.isArray(old) ? updated : { ...old, data: updated };
    });
    ```
  - This updates the screen in < 5ms with **0 HTTP network roundtrips**.
- **Debounce and Batch Bulk Invalidation Signals (150ms Window)**:
  - When bulk actions occur (e.g. 50 tasks imported, 20 items distributed), collect incoming event keys into an in-memory `Set` and flush them via a single `invalidateQueries()` call after a 150ms debounce window.
- **Scope Invalidation by Actor and Role**:
  - Inspect the event payload actor: if `task:replenished` targets a specific user ID, only invalidate private queues if the current user matches that ID or is a supervisor/admin.
- **Implement Automatic Session Eviction on 401 Unauthorized**:
  - Register an HTTP response interceptor that immediately clears client session state and routes to `/login` on HTTP 401, preventing zombie states where background queries loop and fail.

### Negative Anti-Patterns (DO NOT)
- **DO NOT Store Dynamic Query State in `sessionStorage` or `localStorage`**:
  - Never cache API query responses or form draft pipelines in persistent browser storage. Persistent storage introduces cross-tab synchronization drift, cache poisoning across tenant switches, and XSS extraction vulnerabilities. Maintain cache strictly in browser RAM.
- **DO NOT Blindly Prepend Across Tenant/Regional Boundaries**:
  - When receiving `item:created`, never blindly inject the item into matching queries without checking `if (payload.tenantId !== currentTenantId) return;`.
- **DO NOT Assume Response Envelopes Are Always Arrays**:
  - Never write cache mutators assuming `oldData` is a raw array when the API returns an envelope like `{ success: true, data: [...], pagination: {...} }`. Handle both structures defensively.
- **DO NOT Leave Unmanaged Timers in Component Logic**:
  - Never trigger asynchronous delays (e.g., auto-dial timers, refetch loops) with untracked `setTimeout`. Always store timers in `useRef` and clear them on component unmount (`return () => clearTimeout(timerRef.current)`).

---

## 3. Queue Engines, Workers & Database Concurrency

### Positive Strategies (DO)
- **Use Atomic Row-Level Locking (`FOR UPDATE SKIP LOCKED`)**:
  - For worker queues and limited-slot assignment (e.g., claim next 5 unassigned tasks), lock candidates atomically in an interactive transaction:
    ```sql
    SELECT t.id
    FROM tasks t
    WHERE t.assigned_user_id IS NULL
      AND t.status = 'PENDING'
      AND (
        t.batch_id IS NULL
        OR EXISTS (
          SELECT 1 FROM batches b
          WHERE b.id = t.batch_id
            AND (b.scheduled_at IS NULL OR b.scheduled_at <= NOW())
        )
      )
    ORDER BY t.priority DESC, t.created_at ASC
    LIMIT :slotsNeeded
    FOR UPDATE SKIP LOCKED;
    ```
- **Ensure Queue Worker Idempotency**:
  - Design worker consumers to be idempotent. If a job is retried or delivered twice, verify entity state before applying state mutations.
- **Maintain a Single Source of Truth for Replenishment**:
  - Delegate slot calculation and task claiming exclusively to the queue worker. Do not write duplicate in-band HTTP assignment logic that races against background workers.

### Negative Anti-Patterns (DO NOT)
- **DO NOT Execute `FOR UPDATE` on Outer Joins (`LEFT JOIN`) Without Table Targeting**:
  - In PostgreSQL, calling `FOR UPDATE` on a query containing a `LEFT JOIN` without specifying `FOR UPDATE OF <primary_alias>` fails with:
    `ERROR: FOR UPDATE cannot be applied to the nullable side of an outer join`.
  - Use an `EXISTS` subquery or target the primary table explicitly.
- **DO NOT Execute Sequential `findMany` + `updateMany` Outside a Transaction**:
  - Never read unassigned items in one query and assign them in a subsequent query without row locking. Multiple concurrent workers or HTTP requests will select identical records, resulting in double-assignment and quota violations.
- **DO NOT Allow Administrative Inspection to Trigger Worker Consumption**:
  - Never write inspection endpoints (e.g. `GET /queue`) that automatically claim items for the caller if slots are open. If an Administrator views a team queue, they will accidentally steal unassigned work from front-line workers.

---

## 4. Multi-Tenant Role-Based Access Control (RBAC) & API Security

### Positive Strategies (DO)
- **Enforce Dual-Layer Authorization (Route Middleware + Business Layer)**:
  - Every mutating endpoint must mount an explicit role guard:
    `router.post('/convert', authenticate, authorize(['ADMIN', 'MANAGER']), controller.convert);`
  - In the controller, scope every database query to the validated tenant and user ID:
    `where: { id: resourceId, tenantId: req.user.tenantId }`.
- **Enforce Client-Side Route Guards (`<RoleRoute>`)**:
  - Protect all private frontend paths with role-checking wrappers. Do not rely solely on hiding navigation links in sidebars; unauthorized users can manually navigate to `/accounting` or `/admin` via the URL bar.
- **Sanitize and Scrub Sensitive Internal Records from Downstream Channels**:
  - Strip wholesale material costs, supplier markups, commission metrics, and private staff notes before broadcasting updates to technician, driver, or customer channels.
- **Maintain Strict Role Parity Helpers**:
  - For co-administrative roles (e.g. `GENERAL_MANAGER` having identical privileges to `ADMIN`), centralize checks into a shared predicate: `isAdminOrGM(user.role)` to prevent privilege drift across different modules.

### Negative Anti-Patterns (DO NOT)
- **DO NOT Accept User Roles in Public Self-Registration**:
  - Never allow public sign-up endpoints (`POST /auth/register`) to accept a client-supplied `role` parameter. Public sign-ups must be hardcoded to retail/member roles (`CUSTOMER_MEMBER`). Privileged staff roles must be provisioned exclusively by authenticated administrators.
- **DO NOT Mirror Arbitrary CORS Origins with Credentials Enabled**:
  - Never implement wildcard CORS fallbacks (`callback(null, true)` with `credentials: true`). This completely disables cross-origin protection and exposes authenticated user sessions to CSRF and data theft.
- **DO NOT Trust Client-Supplied Tenant Headers for Non-Superusers**:
  - Never allow a non-admin user to switch tenant context simply by sending `x-tenant-id` or `x-country-code`. Tenant scope for standard users must be read strictly from the authenticated database session or JWT claims.
- **DO NOT Allow In-Band Enum Discrepancies**:
  - Never introduce new status values in controllers or frontend dropdowns without migrating the underlying database enums. Unmatched strings will crash database drivers with unhandled 500 exceptions.

---

## 5. External Tool Integration & System Boundaries

### Positive Strategies (DO)
- **Use Native OS Protocols When External Software Is Standard**:
  - When an organization uses an external platform (e.g. PBX, RingCentral, 3CX, desktop dialers, email clients), implement clean protocol routing:
    - Telephone: `window.location.href = 'tel:' + cleanPhone`
    - Email: `window.location.href = 'mailto:' + email`
  - Combine protocol routing with 1-click clipboard helpers and immediately present the outcome logging form so agents record notes while on their call.
- **Preserve Backend Adapters for Future API Evolution**:
  - Keep backend webhooks, event adapters, and third-party SDK clients intact in a dormant state even when frontend UI components are decoupled.
- **Verify Cryptographic Signatures on Inbound Webhooks**:
  - Always verify incoming webhook signatures (e.g., Telnyx ED25519, Stripe HMAC-SHA256, Twilio signatures) before processing payloads.

### Negative Anti-Patterns (DO NOT)
- **DO NOT Build Fake/Simulated Frontend Softphones**:
  - Never build non-functional in-app softphones with dummy mute/hold buttons, unrouted WebRTC bars, and fake ringing sounds if the company uses an external phone system. It confuses operators, wastes screen real estate, and introduces ghost call states.
- **DO NOT Sever Historical Data When Converting Leads**:
  - When converting a prospective lead into an enterprise customer/fleet, never leave trial jobs or test vehicles orphaned. Re-parent all prior work orders and assets to the newly created account.
- **DO NOT Require On-Scene Payment for Complimentary Trial Work Orders**:
  - When dispatching a trial or demonstration work order (`isTestService: true`), bypass mandatory cash collection or invoice payment validations upon technician completion.

---

## 6. Architecture Quality Audit Checklist

When reviewing or refactoring any multi-tenant, real-time feature, verify:
- [ ] **Transport Cleanliness**: Are WebSockets used for two-way audio/chat and SSE for data push?
- [ ] **Cache Safety**: Is the TanStack Query cache updated in RAM with 0 `sessionStorage`?
- [ ] **Locking Safety**: Does `FOR UPDATE SKIP LOCKED` avoid outer joins (`LEFT JOIN`)?
- [ ] **Public Route Safety**: Is public registration locked to customer roles with zero privilege escalation?
- [ ] **Tenant Isolation**: Does every database query enforce tenant and user ownership?
- [ ] **Enum Alignment**: Do all controller state transitions match database enum definitions?
- [ ] **Real-Time Masking**: Are internal costs and margins stripped before broadcasting to technicians?
