# UI/UX Design System — XtremeCRM

## 1. Brand Identity & Color Scheme
XtremeCRM uses a high-impact **Red & White** visual identity inspired by automotive emergency roadside assistance and mobile tire repair vans. The theme delivers maximum contrast, operational urgency, and sleek modern utility.

### 1.1. Color Palette (Tailwind Tokens)

| Token Name | Hex Code | Tailwind Equivalent | Role & Usage |
| :--- | :--- | :--- | :--- |
| **Brand Primary (Red)** | `#DC2626` | `bg-red-600`, `text-red-600` | Primary action buttons, brand logo, urgent badges, active tabs |
| **Brand Crimson (Dark)** | `#991B1B` | `bg-red-800`, `text-red-800` | Sidebar header, focused outlines, deep contrast accents |
| **Brand Surface (Light)** | `#FEF2F2` | `bg-red-50` | Table row hover, urgent job highlight card background |
| **Pure White** | `#FFFFFF` | `bg-white` | Card backgrounds, modal windows, table surfaces, input backgrounds |
| **App Canvas (Neutral)** | `#F8FAFC` | `bg-slate-50` | Global page background, panel borders |
| **Text Primary** | `#0F172A` | `text-slate-900` | High-contrast body text, headings, numbers |
| **Text Secondary** | `#64748B` | `text-slate-500` | Helper labels, timestamps, vehicle subtext |
| **Border / Divider** | `#E2E8F0` | `border-slate-200` | Card borders, grid separators, table cell borders |

### 1.2. Status Indicator Colors

| Status | Color | Badge Style | Context |
| :--- | :--- | :--- | :--- |
| **Urgent / Emergency** | Vivid Red (`#EF4444`) | `bg-red-100 text-red-700 border-red-300 animate-pulse` | Roadside strandings, flat tires on highways |
| **Standard** | Electric Blue (`#2563EB`) | `bg-blue-100 text-blue-700 border-blue-200` | Standard on-demand calls |
| **Future Booking** | Indigo (`#6366F1`) | `bg-indigo-100 text-indigo-700 border-indigo-200` | Scheduled seasonal tire swaps |
| **En Route / In Progress** | Amber (`#F59E0B`) | `bg-amber-100 text-amber-800 border-amber-300` | Driver driving or actively repairing |
| **Completed / Paid** | Emerald (`#10B981`) | `bg-emerald-100 text-emerald-700 border-emerald-300` | Work finished, invoice collected |
| **Cancelled / Disposed** | Slate Grey (`#64748B`) | `bg-slate-100 text-slate-600 border-slate-200` | RNC, Wrong Number, Cancelled |

---

## 2. Typography & Density
- **Font Family:** `Inter` or `system-ui` for maximum numerical legibility (tire sizes `235/45R18`, currencies `$160.00 CAD`).
- **High-Density Desktop Layout (Dispatchers & Agents):**
  - Compact padding (`py-2 px-3`) for dense table rows.
  - Information-rich tables with sticky headers.
- **Mobile Touch-Optimized Layout (Drivers in Vans):**
  - Minimum tap target size: **48px x 48px** for easy tapping while wearing gloves or in vehicles.
  - High contrast buttons (Solid Red `#DC2626` with White Text `#FFFFFF`).

---

## 3. Core Screen Layouts & Wireframes

### 3.1. Agent Call Intake Modal (Fast Keyboard Data Entry)
A clean, two-column high-speed modal triggered on incoming call:
```
+--------------------------------------------------------------------------+
|  [CALL INTAKE]  Source: [Direct Call v]   Region: [Canada (CAD) v]       |
+------------------------------------+-------------------------------------+
| CUSTOMER & VEHICLE                 | SERVICES & PRICING                  |
| Customer Name: [ John Doe        ] | Services:                           |
| Phone:         [ (555) 234-5678  ] | [x] Tire Repair (Plug)     $80      |
| Alt Phone:     [                 ] | [x] Stem Valve Replace     $25      |
|                                    | Priority:  (o) Urgent  ( ) Standard |
| Breakdown Address (Google Maps):   | ETA:       [ 35 mins ]              |
| [ 123 Hwy 401 East, Toronto     ] |                                     |
|                                    | Payment:   [ POS (Card Reader) v]   |
| Vehicle:                           | Subtotal:  $105.00                  |
| [ 2022 ] [ Honda ] [ Civic       ] | Tax (13%): $13.65                   |
| Tire Size:                         | TOTAL:     $118.65                  |
| [ 235 / 45 / R18                 ] |                                     |
+------------------------------------+-------------------------------------+
| DISPOSITION: [ 1- Booked - Appointment Booked              v ]          |
|                      [ Cancel ]   [ CREATE JOB & DISPATCH (Enter) ]       |
+--------------------------------------------------------------------------+
```

### 3.2. Dispatch Board (Multi-Queue Fleet Hub)
- **Top Bar:** Quick stats (Active Urgent: 3, Standard: 8, Free Drivers: 5).
- **Tabbed Queues:** `Urgent` (red badge), `Standard` (blue badge), `Future Bookings` (indigo badge).
- **Interactive Columns:**
  - **Job # / Time / Customer**
  - **Location & Distance** (shows: `123 Hwy 401 (4.2 km from Driver Mike)`)
  - **Vehicle & Tire** (`2022 Civic - 235/45R18`)
  - **Driver Assignment:** Quick dropdown of nearest online drivers.
  - **Live Status:** `PENDING` $\rightarrow$ `ASSIGNED` $\rightarrow$ `EN_ROUTE` $\rightarrow$ `ARRIVED` $\rightarrow$ `COMPLETED`.
  - **Cash Collected Indicator:** Badges showing cash in hand that needs verification.

### 3.3. Driver Mobile PWA (Field Execution View)
- Outdoor high-visibility view:
  - Giant Customer Address with one-tap `[ Open Google Maps / Waze ]`.
  - Vehicle & Tire Spec: bold text `235/45R18 - NEW TIRE REPLACEMENT`.
  - Customer Phone: one-tap `[ Call Customer ]`.
  - Big Primary Action Stepper:
    1. `[ START DRIVING (En Route) ]`
    2. `[ I HAVE ARRIVED ]`
    3. `[ JOB FINISHED - RECORD PAYMENT ]`
  - Payment Modal: Choice of `Cash Collected ($160.00)` or `POS Terminal Swiped`.

### 3.4. Accounting & Reconciliation Audit View
- **Top Bar Controls:**
  - **Region Dropdown Filter:** `[ All Regions (Global) v ]` | `[ USA (USD) ]` | `[ Canada (CAD) ]` | `[ UK (GBP) ]`
  - **Date Filter Presets:** `[ Today ]` `[ Yesterday ]` `[ Last 3 Days ]` `[ 1 Week ]` `[ Monthly ]`

- **Global Multi-Currency Summary Container (when "All Regions" is selected):**
```text
+---------------------------------------------------------------------------------------------------------+
| GLOBAL SUMMARY CONTAINER                                                                                |
|                                                                                                         |
|   CANADA (CAD)                   UNITED STATES (USD)             UNITED KINGDOM (GBP)                   |
|   Gross (CP):  $14,250.00 CAD    Gross (CP):  $18,400.00 USD     Gross (CP):  £9,850.00 GBP             |
|   Tire Cost:   $ 4,100.00 CAD    Tire Cost:   $ 5,200.00 USD     Tire Cost:   £2,800.00 GBP             |
|   Driver Fee:  $ 2,030.00 CAD    Driver Fee:  $ 2,950.00 USD     Driver Fee:  £1,630.00 GBP             |
|   ---------------------------    ---------------------------     --------------------------             |
|   NET PROFIT:  $ 8,120.00 CAD    NET PROFIT:  $10,250.00 USD     NET PROFIT:  £5,420.00 GBP             |
|   IT Fee IT_B: $   150.00 CAD    IT Fee IT_B: $   100.00 USD     IT Fee IT_B: £   100.00 GBP             |
+---------------------------------------------------------------------------------------------------------+
```
*(Note: When a specific country is selected, the container simplifies to just that country's metrics).*

- **Reconciliation Table:**
  - Columns: Job # | Country | Customer | Driver | Gross Paid | Tire Cost | Driver Cost | **Net Profit** | Payment Method | Receipt | Actions
  - Junior Accountant clicks `[ Attach / View Receipt ]` $\rightarrow$ Senior Accountant clicks `[ Verify & Approve Payout ]`.
