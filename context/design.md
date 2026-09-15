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
| **Urgent / Emergency** | Vivid Red (`#EF4444`) | `bg-red-100 text-red-700 border-red-300 font-bold animate-pulse` | High-priority roadside breakdown |
| **Standard / Pending** | Amber (`#F59E0B`) | `bg-amber-100 text-amber-800 border-amber-300` | In intake queue awaiting dispatch |
| **En Route / Active** | Cobalt Blue (`#3B82F6`) | `bg-blue-100 text-blue-800 border-blue-300` | Driver driving to customer |
| **Arrived / In Progress**| Purple (`#8B5CF6`) | `bg-purple-100 text-purple-800 border-purple-300` | Technician on scene performing tire repair |
| **Completed / Paid** | Emerald (`#10B981`) | `bg-emerald-100 text-emerald-800 border-emerald-300` | Service rendered and payment verified |
| **Cancelled / Irrelevant**| Slate Gray (`#64748B`) | `bg-slate-100 text-slate-700 border-slate-300` | Non-converted leads or cancelled calls |

---

## 2. Core Layout Principles & Page Structure
- **Desktop Grid:** Sticky collapsible sidebar (`260px`), global top bar (`64px`) with regional switcher, quick-stats, and agent presence toggle.
- **Mobile First for Drivers:** Fully responsive viewport with sticky bottom action controls, tap targets $\ge 48\text{px}$, and high-contrast sunlight mode.
- **Strict Page Component Boundaries:**
  - Page orchestrators in `src/pages/` must remain under **150 lines**.
  - Child components strictly mirror page names in `src/components/pages/[pageName]/`.
  - Reusable buttons, modals, badges, and form controls reside in `src/components/ui/`.

---

## 3. High-Velocity Wireframes & Layouts

### 3.1. Inbound Multiple Agent Portal & Telnyx Screen Pop
```text
+---------------------------------------------------------------------------------------------------------+
| [LOGO: XTREME RED]   Region: [ Canada (CAD) v ]   Agent: Sarah M.   Status: [ (●) ACTIVE | Inactive ]  |
+---------------------------------------------------------------------------------------------------------+
| TELNYX INBOUND SCREEN POP MODAL (Auto-pops on active agent screen with caller phone pre-filled)         |
|                                                                                                         |
|  Source: [ 1- Direct Call v ]               Caller Phone: [ (416) 555-0192 ] (Auto-Filled)              |
|  Customer: (●) Self-Booking  ( ) Recipient  Alt Phone:    [ (416) 555-0199 ] (On-scene contact)        |
|  Full Name: [ Johnathan Doe               ] Email:        [ john.doe@gmail.com             ]            |
|  Service Location (Google Places): [ 401 Highway East & Leslie St, Toronto, ON (GPS Geocoded) ]        |
|  Vehicle: [ 2022 ] [ Tesla ] [ Model 3    ] Tire Size:    [ 235/45R18 (Width/Rim Pickers)  ]            |
|                                                                                                         |
|  Select Services (16-Service Catalog):                                                                  |
|  [x] 1. Tire Repair (plug)   [ ] 2. Stem Valve   [ ] 3. New Tire   [ ] 7. Tire Swap   [ ] 13. Jump Start|
|                                                                                                         |
|  Service Priority: [ (●) 1- Urgent   ( ) 2- Standard   ( ) 3- Future Booking ]   ETA: [ 25 Mins ]       |
|  Billing: $160.00 base  [x] + Tax (13% = $20.80)  Total: $180.80 CAD   Method: [ 1- E-Transfer v ]      |
|  Customer Account: [x] "After all this make user account" (Auto-creates login for live tracking)        |
|  Call Disposition: [ 1- Booked - Appointment Booked v ]  Notes: [ Front right flat on shoulder ]        |
|                                                                                                         |
|  [ CANCEL / CLOSE ]                                            [ CREATE & DISPATCH APPOINTMENT (ENTER) ]|
+---------------------------------------------------------------------------------------------------------+
```

### 3.2. Landing Page Public Booking Card (`/`)
```text
+-------------------------------------------------------------------------+
| [ NEED IMMEDIATE ROADSIDE TIRE ASSISTANCE? BOOK ONLINE ]                |
|                                                                         |
| Your Name: [ Michael Vance          ] Phone: [ (416) 555-8821 ]         |
| Breakdown Location: [ Yorkdale Mall Parking Lot G, Toronto ]            |
| Vehicle: [ 2021 Honda Civic       ] Tire Size: [ 215/50R17 ]            |
| Service Needed: [ Tire Repair (Plug) v ]                                |
|                                                                         |
| [ REQUEST ROADSIDE DISPATCH ] -> Enters unverified queue (Call Agent verifies)|
+-------------------------------------------------------------------------+
```

### 3.3. Dispatch Manager Board & Fleets Sidebar
```text
+---------------------------------------------------------------------------------------------------------+
| SIDEBAR     | DISPATCH MANAGER BOARD                                             Search: [___________]   |
| ----------- | ----------------------------------------------------------------------------------------- |
| Dispatch    | [!] URGENT DISPATCH QUEUE (3 JOBS) [ CLICK TO EXPAND ALL ROW ACCORDIONS v ]              |
| Drivers     | +---------------------------------------------------------------------------------------+ |
| Fleets (B2B)| | [v] JOB-CA-10492 | 401 Hwy & Leslie | 235/45R18 Tesla Model 3 | ETA: 20m | $180.80 CAD| |
| Accounting  | |     Customer: Johnathan Doe (416-555-0192) | Alt: 416-555-0199                         | |
| Settings    | |     Assigned Driver: [ Dave Miller (Van #3 - 4.2 km away) v ] [ ASSIGN ]               | |
|             | |     Actions: [ Message Driver ] [ Open Map Pin ] [ Cancel Ticket ]                      | |
|             | +---------------------------------------------------------------------------------------+ |
|             |                                                                                           |
|             | ARBITRARY ADDRESS DISTANCE MEASUREMENT TOOL:                                              |
|             | Type any address: [ 77 King St West, Toronto, ON                     ] [ MEASURE DIST ]  |
|             | -> Dave Miller: 3.8 km (11 min) | Kevin S: 8.4 km (22 min) | Alex R: 14.1 km (35 min)     |
|             |                                                                                           |
|             | DRIVER CASH IN HAND SECTION:                                                             |
|             | Dave Miller (Van #3): $320.00 CAD collected | Kevin S (Van #1): $160.00 CAD collected     |
|             |                                                                                           |
|             | DRIVER MESSAGING DRAWER (Job #10492):                                                     |
|             | [Dave (Driver)]: Customer says lug nuts are locking type, I have the master key set.      |
|             | [Dispatcher]: Approved, proceed with plug service.                                       |
+---------------------------------------------------------------------------------------------------------+
```

### 3.4. WorkFlow for Fleets Sign-Up (B2B Sidebar Page)
```text
+---------------------------------------------------------------------------------------------------------+
| FLEET MANAGEMENT (B2B PARTNERS)                                           [ + ADD NEW FLEET PROFILE ]   |
+---------------------------------------------------------------------------------------------------------+
| Company Name        | Fleet Size | Contact Person  | Phone        | Verified Partner | VA Commission |
| ------------------- | ---------- | --------------- | ------------ | ---------------- | ------------- |
| Metro Delivery Inc. | 24 Vans    | Robert Hayes    | 416-555-4400 | [x] Verified     | $2.50 / job   |
| QuickHaul Logistics | 12 Trucks  | Susan Walker    | 416-555-7711 | [x] Verified     | $3.00 / job   |
| Apex Courier Corp   | 8 Vans     | Mark Patel      | 416-555-9090 | [ ] Pending Sign | -             |
+---------------------------------------------------------------------------------------------------------+
```

### 3.5. Driver Mobile PWA (Field Execution View)
```text
+----------------------------------------------------+
| [XTREME RED] JOB #10492             [ STATUS: EN ROUTE ]
|                                                    |
| Customer: Johnathan Doe                            |
| Address:  401 Highway East & Leslie St             |
| [ >>> OPEN IN GOOGLE MAPS / WAZE NAVIGATION <<< ]  |
|                                                    |
| Vehicle:   2022 Tesla Model 3                      |
| Tire Spec: 235/45R18 - TIRE REPAIR (PLUG)          |
|                                                    |
| DRIVER EARNINGS FOR THIS JOB:                      |
| Gross Customer Paid: $180.80 CAD | Your Net: $65.00|
|                                                    |
| BIG FIELD STEPPER:                                 |
| 1. [ START DRIVING (EN ROUTE) ]                    |
| 2. [ I HAVE ARRIVED ON SITE   ]                    |
| 3. [ WORK IN PROGRESS         ]                    |
| 4. [ COMPLETE & RECORD PAYMENT ]                   |
|                                                    |
| [ IN-APP CHAT WITH DISPATCH (1 Unread) ]           |
+----------------------------------------------------+
```

### 3.6. Accounting & Reconciliation View & Expense Stating

```text
+---------------------------------------------------------------------------------------------------------+
| ACCOUNTING DEPARTMENT                                  User: Senior Accountant | Role: ACCOUNTANT_SR     |
+---------------------------------------------------------------------------------------------------------+
| Region Filter: [ All Regions (Global) v ]  Period: [ Yesterday v | Last 3 Days | One Week | Monthly ]  |
|                                                                                                         |
| MULTI-CURRENCY SUMMARY CARDS:                                                                           |
| +-----------------------------+ +-----------------------------+ +-----------------------------+         |
| | CANADA (CAD)                | | UNITED STATES (USD)         | | UNITED KINGDOM (GBP)        |         |
| | Gross Paid (CP): $18,400.00 | | Gross Paid (CP): $24,100.00 | | Gross Paid (CP): £12,800.00 |         |
| | Material (TC):   $ 4,900.00 | | Material (TC):   $ 6,200.00 | | Material (TC):   £ 3,400.00 |         |
| | Repairer (DC):   $ 3,100.00 | | Repairer (DC):   $ 4,500.00 | | Repairer (DC):   £ 2,200.00 |         |
| | --------------------------- | | --------------------------- | | --------------------------- |         |
| | NET PROFIT:      $10,400.00 | | NET PROFIT:      $13,400.00 | | NET PROFIT:      £ 7,200.00 |         |
| | IT Fee (IT_B):   $   180.00 | | IT Fee (IT_B):   $   120.00 | | IT Fee (IT_B):   £   120.00 |         |
| | TOTAL NET (IT_B):$10,220.00 | | TOTAL NET (IT_B):$13,280.00 | | TOTAL NET (IT_B):£ 7,080.00 |         |
| +-----------------------------+ +-----------------------------+ +-----------------------------+         |
|                                                                                                         |
| RECONCILIATION & EXPENSE STATING TABLE:                                                                 |
| Job #    | CX Name   | Driver   | Gross(CP)| Material(TC)| Repairer(DC)| Net Profit | Verified? | Receipt |
| -------- | --------- | -------- | -------- | ----------- | ----------- | ---------- | --------- | ------- |
| CA-10492 | Johnathan | Dave M.  | $180.80  | $ 35.00     | $ 65.00     | $ 80.80    | [x] YES   | [View]  |
| CA-10493 | Apex Ltd  | Kevin S. | $320.00  | $ 95.00     | $110.00     | $115.00    | [ ] NO    | [Attach]|
+---------------------------------------------------------------------------------------------------------+
| MODAL: [ STATE JOB EXPENSES & VERIFY PAYMENT ]                                                          |
| Job Ticket: #CA-10492 (Tire Repair + Valve)   Customer Paid (CP): $180.80 CAD                           |
|                                                                                                         |
| 1. State Material Fees (TC): [ $35.00 CAD  ]  Upload Supplier Receipt: [ Browse / Drag & Drop ]         |
| 2. State Repairer Fees (DC): [ $65.00 CAD  ]  Repairer: Dave Miller (Van #3)                           |
| 3. Other Incidental Expense: [ $ 0.00 CAD  ]  Notes: [ Wholesale patch & valve stem used ]             |
|                                                                                                         |
| CALCULATED NET MARGIN: $80.80 CAD (CP $180.80 - TC $35.00 - DC $65.00)                                 |
| PLATFORM ROYALTY IT_B: $ 1.50 CAD -> Net After Royalty: $79.30 CAD                                     |
|                                                                                                         |
| PAYMENT AUDIT:                                                                                          |
| Payment Method: E-Transfer | Reference #: [ ET-99201481 ]                                              |
| [x] MARK PAYMENT AS VERIFIED (Sets isPaymentVerified = true with audit stamp)                           |
|                                                                                                         |
| [ CLOSE ]                     [ SAVE JOB EXPENSES (Junior) ]        [ APPROVE & FINALIZE (Senior) ]    |
+---------------------------------------------------------------------------------------------------------+
```

### 3.7. Admin Portal ("Admin sees every thing")
- Global overview displaying all live regional KPIs (Canada, USA, UK).
- Real-time heat maps of roadside emergencies, fleet growth metrics, Virtual Assistant commission ledger totals, and consolidated profit margins.
