# UI/UX Design System & Specification — XtremeCRM

## 1. Aesthetic Archetype & Design Manifesto

XtremeCRM rejects generic, bland "AI slop" (monotonous white cards, gray borders, overused generic fonts, and timid purple-indigo gradients). Roadside tire emergencies and fleet dispatching operate in high-pressure, physical real-world conditions. 

The design system commits strictly to the **Industrial Utilitarian & Tactical Emergency Roadside Console** archetype, fused with **Spatial High-Contrast Dark Canvas & High-Voltage Emergency Red**.

### 1.1. Core Visual Directives
- **High Operational Velocity:** Every milliseconds-critical action (call intake, driver dispatch, distance calculation, expense stating) is keyboard-accessible with deterministic spatial hierarchy.
- **Unmistakable Contrast:** High-voltage emergency red against deep obsidian black and stark white provides instant clarity under harsh outdoor sunlight or low-light dispatch rooms.
- **Tactile Depth & Surfaces:** Layered surfaces, 1px specular inner highlights, and crisp industrial hairline borders replace fuzzy generic drop shadows.
- **Zero Ambiguity Tabular Metrics:** All currencies, tire dimensions, license plates, ETAs, and GPS coordinates use tabular monospace typography with strict column alignment.
- **Disciplined 60-30-10 Color Balance:**
  - **60% Dominant Canvas:** Deep obsidian void (`oklch(12% 0.015 260)` / `#0A0D14`) in dark/terminal views, and stark clean slate (`oklch(98.5% 0.005 80)` / `#F8FAFC`) in daylight views.
  - **30% Structural Neutrals:** Graphite cards, specular borders (`border-white/10` or `border-slate-200`), muted tabular captions.
  - **10% High-Voltage Accents:** Emergency Red (`oklch(58% 0.24 27)` / `#DC2626`), Tactical Radar Green (`oklch(72% 0.22 145)` / `#10B981`), Amber Caution (`oklch(75% 0.18 75)` / `#F59E0B`), and Aviation Cobalt (`oklch(60% 0.20 250)` / `#3B82F6`).

---

## 2. Color Palette & Token Architecture

### 2.1. Color Tokens (OKLCH & Tailwind Utility Mappings)

| Token Name | OKLCH Value | Hex / RGB | Tailwind Class | Role & Operational Context |
| :--- | :--- | :--- | :--- | :--- |
| `--brand-emergency` | `oklch(58% 0.24 27)` | `#DC2626` | `bg-red-600 text-red-600` | Primary action buttons, brand mark, urgent badges, active intake tabs |
| `--brand-crimson-dark` | `oklch(42% 0.22 27)` | `#991B1B` | `bg-red-800 text-red-800` | Focused outlines, high-priority row highlights, header borders |
| `--brand-surface-tint` | `oklch(96% 0.03 27)` | `#FEF2F2` | `bg-red-50 text-red-950` | Urgent job highlight card surface, flash banners |
| `--canvas-dark` | `oklch(12% 0.015 260)`| `#0A0D14` | `bg-[#0A0D14]` | Client portal dark backgrounds, dispatch console canvas |
| `--surface-dark-1` | `oklch(16% 0.018 260)`| `#111827` | `bg-slate-900 / bg-gray-900` | Card containers, sidebar background, bento tiles |
| `--surface-dark-2` | `oklch(20% 0.022 260)`| `#1E293B` | `bg-slate-800` | Input backgrounds, table header rows, hover states |
| `--canvas-light` | `oklch(98.5% 0.005 80)`| `#F8FAFC` | `bg-slate-50` | Admin daylight page background |
| `--surface-light` | `oklch(100% 0 0)` | `#FFFFFF` | `bg-white` | Modal windows, data tables, light cards |
| `--text-primary-dark` | `oklch(98% 0.005 260)`| `#F8FAFC` | `text-slate-50` | High-contrast headings and active metrics |
| `--text-secondary-dark` | `oklch(75% 0.015 260)`| `#94A3B8` | `text-slate-400` | Secondary labels, vehicle specs, timestamps |
| `--border-specular-dark`| `oklch(90% 0.02 260 / 0.12)` | `rgba(255,255,255,0.12)` | `border-white/10` | 1px crisp specular card and table borders |
| `--border-subtle-light` | `oklch(90% 0.008 260)`| `#E2E8F0` | `border-slate-200` | Table cell borders, light input outlines |

### 2.2. Status Indicator LEDs & Badge Styles

```css
/* Tactical Status System */
.status-pill-urgent {
  background: oklch(58% 0.24 27 / 0.15);
  color: oklch(62% 0.25 25);
  border: 1px solid oklch(58% 0.24 27 / 0.4);
  box-shadow: 0 0 10px oklch(58% 0.24 27 / 0.3);
  animation: pulseLed 2s infinite ease-in-out;
}

.status-pill-active {
  background: oklch(72% 0.22 145 / 0.15);
  color: oklch(72% 0.22 145);
  border: 1px solid oklch(72% 0.22 145 / 0.4);
}

.status-pill-enroute {
  background: oklch(60% 0.20 250 / 0.15);
  color: oklch(68% 0.20 250);
  border: 1px solid oklch(60% 0.20 250 / 0.4);
}

.status-pill-pending {
  background: oklch(75% 0.18 75 / 0.15);
  color: oklch(75% 0.18 75);
  border: 1px solid oklch(75% 0.18 75 / 0.4);
}

@keyframes pulseLed {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.75; transform: scale(0.98); }
}
```

---

## 3. Typography & Fluid Scale

### 3.1. Type Hierarchy & Font Pairings
- **Display Headings & Screen Titles:** `Cabinet Grotesk` or `Plus Jakarta Sans` (ExtraBold 800/900) with tight optical tracking (`letter-spacing: -0.035em`).
- **Standard UI & Interactive Body:** `Plus Jakarta Sans` (400 Regular, 500 Medium, 600 SemiBold).
- **Tabular Data, Tire Specs, Prices & VINs:** `Chivo Mono` or `JetBrains Mono` with forced tabular numbers (`font-variant-numeric: tabular-nums`).

### 3.2. Fluid Clamp Scale
```css
:root {
  --text-hero: clamp(2.5rem, 4vw + 1rem, 4.5rem);       /* 40px -> 72px */
  --text-h1: clamp(1.85rem, 2.5vw + 0.8rem, 2.75rem);   /* 30px -> 44px */
  --text-h2: clamp(1.4rem, 1.8vw + 0.6rem, 2rem);       /* 22px -> 32px */
  --text-h3: clamp(1.15rem, 1.2vw + 0.5rem, 1.5rem);    /* 18px -> 24px */
  --text-body: 0.9375rem;                                /* 15px crisp body */
  --text-sm: 0.8125rem;                                  /* 13px helper */
  --text-xs: 0.6875rem;                                  /* 11px uppercase badge */
}

.mono-metric {
  font-family: 'Chivo Mono', 'JetBrains Mono', monospace;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

.eyebrow-label {
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.09em;
  font-weight: 700;
}
```

---

## 4. Surfaces, Motion & Micro-Interactions

### 4.1. Tactical Card Elevation & Specular Depth
```css
.card-tactical {
  background: var(--surface-dark-1);
  border: 1px solid var(--border-specular-dark);
  border-radius: 12px;
  box-shadow: 
    0 1px 2px rgba(0, 0, 0, 0.4),
    0 4px 16px -2px rgba(0, 0, 0, 0.6),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  transition: transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.18s ease;
}

.card-tactical:hover {
  transform: translateY(-2px);
  border-color: rgba(220, 38, 38, 0.4);
}
```

### 4.2. Tactile Button Depression & Micro-States
```css
.btn-pressable {
  transition: transform 0.1s cubic-bezier(0.16, 1, 0.3, 1), filter 0.15s ease;
}
.btn-pressable:active {
  transform: scale(0.97);
}

/* Native Dialog with @starting-style */
.modal-tactical {
  border: none;
  background: transparent;
  padding: 0;
  margin: auto;
  max-width: 640px;
  width: 92vw;
  transition: opacity 0.22s cubic-bezier(0.16, 1, 0.3, 1), transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), display 0.22s allow-discrete, overlay 0.22s allow-discrete;
  opacity: 0;
  transform: scale(0.95) translateY(10px);
}
.modal-tactical[open] {
  opacity: 1;
  transform: scale(1) translateY(0);
}
@starting-style {
  .modal-tactical[open] {
    opacity: 0;
    transform: scale(0.95) translateY(10px);
  }
}
.modal-tactical::backdrop {
  background: rgba(10, 13, 20, 0.75);
  backdrop-filter: blur(8px);
  transition: opacity 0.22s ease, display 0.22s allow-discrete, overlay 0.22s allow-discrete;
  opacity: 0;
}
.modal-tactical[open]::backdrop {
  opacity: 1;
}
@starting-style {
  .modal-tactical[open]::backdrop {
    opacity: 0;
  }
}
```

---

## 5. Architectural Portal Topology & Layouts

The system is architecturally split into **Internal Staff Operations** (`/admin`) and **External Client Sandboxes** (`/fleet-dashboard` and `/member-dashboard`).

```text
+----------------------------------------------------------------------------------------------------+
|                                    XTREME CRM FRONTEND SUITE                                       |
|                                                                                                    |
|  +-----------------------------------+  +--------------------------------+  +-------------------+  |
|  |       INTERNAL STAFF PORTAL       |  |     B2B FLEET CLIENT PORTAL    |  | PERSONAL MEMBER   |  |
|  |              /admin               |  |        /fleet-dashboard        |  | /member-dashboard |  |
|  |-----------------------------------|  |--------------------------------|  |-------------------|  |
|  | - Admin God-Mode Oversight        |  | - 18+ Fleet Vehicles & Plates  |  | - Personal Vehicle|  |
|  | - Telnyx Inbound Screen Pop       |  | - "My Drivers" Fast Lookup     |  | - Priority Callout|  |
|  | - Dispatch Distance Calculator    |  | - 1-Click Roadside Dispatch    |  | - Member Pricing  |  |
|  | - Accountant Job Expense Stating  |  | - Commercial Invoices & P&L    |  | - Digital Receipts|  |
|  | - Multi-Currency P&L (CAD/USD/GBP)|  | - Direct Dispatcher Inbox      |  |                   |  |
|  +-----------------------------------+  +--------------------------------+  +-------------------+  |
+----------------------------------------------------------------------------------------------------+
```

---

## 6. High-Velocity Wireframes & Interface Blueprints

### 6.1.A. Returning Customer / Verified Fleet Screen Pop Wireframe (`/admin/intake`)

```text
+---------------------------------------------------------------------------------------------------------+
| [XTREME RED LOGO]   Region: [ Canada (CAD) v ]   Agent: Sarah Miller    Status: [ (●) ACTIVE | Inactive ]|
+---------------------------------------------------------------------------------------------------------+
| TELNYX WEBRTC DIGITAL PHONE CONTROLS:                                                                   |
| [!] INCOMING CALL: (416) 555-0192 (Ontario, CA)   [ ANSWER (SPACEBAR) ] [ MUTE ] [ REJECT / BUSY ]     |
+---------------------------------------------------------------------------------------------------------+
| HIGH-VELOCITY DISPATCH INTAKE MODAL (Opens automatically on ring):                                      |
|                                                                                                         |
| === 1. AUTO-POPULATED BY SYSTEM (Zero Typing on Ring) ================================================== |
| Caller Phone: [ (416) 555-0192 ] (Auto-Filled)   Lead Source: [ 1- Direct Call v ] (Auto-Defaulted)       |
| Status Match: [✓] RETURNING CUSTOMER FOUND -> Johnathan Doe | Alt: 416-555-0199 | john.doe@gmail.com    |
| Saved Vehicles: [ (●) 2022 Tesla Model 3 (235/45R18)  ( ) Add New Vehicle ]                             |
|                                                                                                         |
| === 2. AGENT-ENTERED DURING LIVE CONVERSATION (Asked from Motorist) ==================================== |
| Recipient Type: [ (●) Stranded Motorist is Caller   ( ) Booking for Recipient / Driver on Scene ]       |
| Roadside Location (Google Places Autocomplete):                                                         |
| [ 401 Highway East & Leslie St, Toronto, ON (GPS Lat: 43.768, Lng: -79.370)                          ]  |
| Landmark / Position: [ Front right flat on shoulder, 200m east of Leslie exit ramp                  ]  |
|                                                                                                         |
| Vehicle & Tire Confirmation:                                                                            |
| Make/Model: [ 2022 Tesla Model 3 ]   Tire Spec: [ 235/45R18 ] (Verified by driver)                      |
|                                                                                                         |
| 16-Service Roadside Picker:                                                                             |
| [x] 1. Tire Repair (Plug)  [ ] 2. Stem Valve   [ ] 3. New Tire   [ ] 7. Seasonal Swap   [ ] 13. Jump   |
|                                                                                                         |
| Operational Urgency & Agreed ETA:                                                                       |
| Priority: [ (●) 1- Urgent (Emergency)   ( ) 2- Standard   ( ) 3- Future Booking ]   ETA: [ 20 Mins ]    |
|                                                                                                         |
| Billing & Financial Controls:                                                                           |
| Base Quote: [ $160.00 CAD ]   Tax Toggle: [x] + Tax (13% = $20.80)   Total Amount: [ $180.80 CAD ]      |
| Payment Method: [ 1- E-Transfer v ]   Customer Account: [x] "After all this make user account"          |
|                                                                                                         |
| Mandatory Call Outcome Classification:                                                                  |
| Call Disposition: [ 1- Booked - Appointment Booked v ]                                                  |
| Problem Notes: [ Front right flat puncture, wheel lock key located in center console ]                  |
|                                                                                                         |
| [ DISCARD / CANCEL ]                                          [ CONFIRM & TRANSMIT TO DISPATCH (ENTER) ]|
+---------------------------------------------------------------------------------------------------------+
```

### 6.1.B. First-Time Caller / Non-User Roadside Intake Wireframe (`/admin/intake`)

```text
+---------------------------------------------------------------------------------------------------------+
| [XTREME RED LOGO]   Region: [ Canada (CAD) v ]   Agent: Sarah Miller    Status: [ (●) ACTIVE | Inactive ]|
+---------------------------------------------------------------------------------------------------------+
| TELNYX WEBRTC DIGITAL PHONE CONTROLS:                                                                   |
| [!] INCOMING CALL: (416) 555-8821   Detected Region: Toronto / GTA, ON   [ ANSWER (SPACEBAR) ] [ MUTE ] |
+---------------------------------------------------------------------------------------------------------+
| FIRST-TIME MOTORIST INTAKE MODAL (Opens automatically on ring):                                         |
|                                                                                                         |
| CALLER STATUS: [✦ NEW CALLER / NON-USER ]             Quick Link: [ + LINK TO B2B FLEET ACCOUNT ]      |
|                                                                                                         |
| 1. MOTORIST IDENTITY (Phone Locked from Caller ID):                                                     |
| Caller Phone: [ (416) 555-8821 ] (Auto-Filled)   Full Name: [ Michael Vance                   ]         |
| Alternate / On-Scene Phone: [ (416) 555-0199 ]   Email:     [ michael.vance@gmail.com        ]         |
| Caller Role:  [ (●) Stranded Motorist is Caller   ( ) Calling on Behalf of Recipient ]                  |
|                                                                                                         |
| 2. ROADSIDE BREAKDOWN LOCATION:                                                                         |
| Location (Google Places): [ Yorkdale Mall Parking Lot G, Toronto, ON (GPS: 43.725, -79.452)           ]  |
| Landmark / Details:       [ Parked near pillar D4 by Hudson's Bay, hazards flashing                   ]  |
|                                                                                                         |
| 3. VEHICLE & TIRE SPECIFICATION:                                                                        |
| Vehicle: Year: [ 2021 ]   Make: [ Honda     ]   Model: [ Civic       ]                                  |
| Tire Size: [ 215/50R17 ] (Agent tip: Guide customer to driver's door jamb sticker or tire sidewall)    |
|                                                                                                         |
| 4. SERVICE CATALOG:                                                                                     |
| [x] 1. Tire Repair (Plug)  [ ] 2. Stem Valve   [ ] 3. New Tire   [ ] 9. Spare Change   [ ] 13. Jump     |
|                                                                                                         |
| 5. OPERATIONAL PRIORITY & AGREED ETA:                                                                   |
| Priority: [ (●) 1- Urgent (Emergency)   ( ) 2- Standard   ( ) 3- Future ]   Agreed ETA: [ 25 Mins ]     |
|                                                                                                         |
| 6. BILLING, TAX & SEAMLESS ACCOUNT ONBOARDING:                                                          |
| Base Quote: [ $160.00 CAD ]   Tax: [x] + Tax (13% = $20.80)   Total Amount: [ $180.80 CAD ]             |
| Payment Method: [ 1- E-Transfer v ]                                                                     |
| [x] AUTO-CREATE CUSTOMER ACCOUNT & SEND LIVE SMS TRACKING LINK (Pre-Checked by Default)                 |
|     -> Auto-saves Customer profile, registers vehicle & tire size, and texts live driver tracking URL   |
|                                                                                                         |
| 7. MANDATORY CALL DISPOSITION:                                                                          |
| Disposition: [ 1- Booked - Appointment Booked v ]                                                       |
| Problem Notes: [ Screw in right rear tread, holds partial air, driver waiting inside vehicle ]          |
|                                                                                                         |
| QUICK NON-BOOKING SHORTCUTS (1-Click dismiss for non-conversions):                                      |
| [ 2- RNC (Price Shopper) ]  [ 3- WN (Wrong Number) ]  [ 4- IR (Irrelevant Service) ]  [ 5- Cancelled ]  |
|                                                                                                         |
| [ DISCARD / ESC ]                                             [ BOOK & TRANSMIT TO DISPATCH (ENTER) ]   |
+---------------------------------------------------------------------------------------------------------+
```

### 6.2. Dispatch Manager Tactical Board (`/admin/dispatch`)

```text
+---------------------------------------------------------------------------------------------------------+
| DISPATCH CONTROL   | URGENT QUEUE (3 BREAKDOWNS)                        Search: [ License / Phone... ] |
+--------------------+------------------------------------------------------------------------------------+
| [v] URGENT ROADSIDE ASSISTANCE TICKETS (CLICK TO EXPAND ACCORDION)                                      |
| +-----------------------------------------------------------------------------------------------------+ |
| | [!] JOB #CA-10492 | 401 Hwy & Leslie | 235/45R18 Tesla Model 3 | ETA: 20m | Total: $180.80 CAD       | |
| |     Customer: Johnathan Doe (416-555-0192) | Alt Phone: 416-555-0199                                | |
| |     Assigned Mobile Van: [ Dave Miller (Van #3 - 4.2 km / 9 mins away) v ] [ RE-ASSIGN ]            | |
| |     Quick Actions: [ Open Map Pin ] [ Message Technician ] [ Cancel Ticket ]                        | |
| +-----------------------------------------------------------------------------------------------------+ |
|                                                                                                         |
| ARBITRARY ADDRESS DISTANCE MEASUREMENT TOOL:                                                            |
| Type any destination address: [ 77 King St West, Toronto, ON                       ] [ MEASURE DIST ]  |
| -> Van #3 (Dave Miller): 3.8 km (11 min) | Van #1 (Kevin S): 8.4 km (22 min) | Van #2: 14.1 km (35 min)  |
|                                                                                                         |
| DRIVER CASH-IN-HAND LEDGER:                                                                             |
| Dave Miller (Van #3): $320.00 CAD collected | Kevin S (Van #1): $160.00 CAD collected                   |
|                                                                                                         |
| REAL-TIME DRIVER MESSAGING DRAWER (Job #CA-10492):                                                      |
| [Dave Miller (Technician)]: Customer vehicle has locking lug nuts; I have the master socket set ready.   |
| [Dispatcher]: Noted. Customer payment confirmed via E-Transfer. Proceed with tire plug.                |
+---------------------------------------------------------------------------------------------------------+
```

### 6.3. Driver Mobile PWA (Field Execution View — `/driver`)

```text
+----------------------------------------------------+
| [XTREME RED] TICKET #CA-10492   [ STATUS: EN ROUTE ]
+----------------------------------------------------+
| CUSTOMER & LOCATION:                                |
| Johnathan Doe — (416) 555-0192                      |
| 401 Highway East & Leslie St, Toronto               |
|                                                    |
| [ >>> 1-TAP OPEN IN GOOGLE MAPS / WAZE <<< ]       |
|                                                    |
| VEHICLE & TIRE SPECIFICATION:                      |
| 2022 Tesla Model 3                                 |
| Spec: 235/45R18 — TIRE REPAIR (PLUG)               |
|                                                    |
| DRIVER PAYOUT SUMMARY:                             |
| Gross Ticket: $180.80 CAD | Your Payout: $65.00 CAD |
|                                                    |
| FIELD EXECUTION STEPPER:                           |
| 1. [ START DRIVING (EN ROUTE) ]                     |
| 2. [ I HAVE ARRIVED ON SCENE   ]                   |
| 3. [ COMMENCE TIRE SERVICE     ]                   |
| 4. [ COMPLETE & RECORD PAYMENT ]                   |
|                                                    |
| [ IN-APP DISPATCH CHAT (1 Unread) ]                |
+----------------------------------------------------+
```

### 6.4. Accountant Department & Active Job Expense Stating View (`/admin/accounting`)

```text
+---------------------------------------------------------------------------------------------------------+
| FINANCIAL RECONCILIATION & JOB COSTING                    User: Senior Accountant | Role: ACCOUNTANT_SR |
+---------------------------------------------------------------------------------------------------------+
| Region: [ All Regions (Global) v ]   Date Filter: [ Yesterday v | Last 3 Days | One Week | Monthly ]   |
|                                                                                                         |
| MULTI-CURRENCY REGIONAL P&L CARDS (STRICT ZERO-SUM ISOLATION):                                          |
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
| COMPLETED TICKETS AUDIT & EXPENSE STATING TABLE:                                                        |
| Job #    | Customer    | Technician | Gross (CP)| Material(TC)| Repairer(DC)| Net Profit | Verified?| Slip  |
| -------- | ----------- | ---------- | --------- | ----------- | ----------- | ---------- | -------- | ----  |
| CA-10492 | Johnathan D | Dave M.    | $180.80   | $ 35.00     | $ 65.00     | $ 80.80    | [x] YES  | [View]|
| CA-10493 | Apex Fleet  | Kevin S.   | $320.00   | $ 95.00     | $110.00     | $115.00    | [ ] NO   | [Add] |
+---------------------------------------------------------------------------------------------------------+
| ACTIVE MODAL: [ STATE JOB EXPENSES & VERIFY PAYMENT ]                                                   |
| Ticket: #CA-10492 (Tire Plug + Stem Valve) | Customer Collected (CP): $180.80 CAD                       |
|                                                                                                         |
| 1. State Material Fees (TC):   [ $35.00 CAD  ]   Upload Supplier Slip: [ Drag & Drop Slip / PDF ]       |
| 2. State Repairer Fees (DC):   [ $65.00 CAD  ]   Technician: Dave Miller (Van #3)                       |
| 3. Other Incidental Expenses:  [ $ 0.00 CAD  ]   Notes: [ Patch kit & brass stem valve from batch #4 ]  |
|                                                                                                         |
| COMPUTED DERIVED METRICS:                                                                               |
| Net Margin: $80.80 CAD ($180.80 CP - $35.00 TC - $65.00 DC)                                             |
| IT Platform Royalty (IT_B): $1.50 CAD -> Net After IT_B: $79.30 CAD                                     |
|                                                                                                         |
| PAYMENT VERIFICATION AUDIT:                                                                             |
| Method: E-Transfer | Reference: [ ET-99201481 ]                                                         |
| [x] MARK PAYMENT AS VERIFIED (Sets isPaymentVerified = true with audit timestamp and user signature)    |
|                                                                                                         |
| [ CANCEL ]                    [ SAVE EXPENSES (Junior) ]              [ APPROVE & FINALIZE (Senior) ]   |
+---------------------------------------------------------------------------------------------------------+
```

### 6.5. External B2B Fleet Manager Portal (`/fleet-dashboard`)

Mirroring the user-verified screenshots and commercial workflow:

```text
+---------------------------------------------------------------------------------------------------------+
| [LOGO] FLEET MANAGER PORTAL   Group: Xtreme Fleet Group   Vehicle ID: XMT-5132   Status: [ APPROVED ]   |
| Assigned Internal Email: piratheep@xtrememobiletire.com                                   [ SIGN OUT ]  |
+---------------------+-----------------------------------------------------------------------------------+
| SIDEBAR NAVIGATION | FLEET TELEMETRY OVERVIEW                                                          |
| ------------------- | --------------------------------------------------------------------------------- |
| [●] Dashboard       | BENTO KPI METRICS:                                                                |
| [ ] Vehicles        | +--------------------+ +--------------------+ +--------------------+              |
| [ ] My Drivers      | | 18 VEHICLES        | | 0 DRIVERS          | | "KT" FLEET CODE    |              |
| [ ] Service Request | | Registered in Fleet| | On-Call in Fleet   | | Active Tier        |              |
| [ ] Service Status  | +--------------------+ +--------------------+ +--------------------+              |
| [ ] Pending Invoices|                                                                                   |
| [ ] Paid Invoices   | 24/7 ROADSIDE SERVICE REQUEST (QUICK DISPATCH):                                   |
| [ ] Inbox / Messages| Select Vehicle: [ KT-15 (Freightliner Cascadia - 11R22.5) v ]                       |
|                     | Driver on Scene: [ Marcus Brody (571-555-0144) ]                                  |
|                     | Current Breakdown Location: [ I-95 South Exit 152, Manassas, VA ]                 |
|                     | Urgent Issue: [ Steer Tire Puncture / Shredded Tread v ]                          |
|                     | [ TRANSMIT PRIORITY ROADSIDE DISPATCH REQUEST ]                                    |
|                     |                                                                                   |
|                     | ACTIVE FLEET VEHICLES DIRECTORY (PRE-REGISTERED SPECIFICATIONS):                  |
|                     | Plate: KT-15 | 2023 Freightliner | Tire: 11R22.5 Commercial Drive | Status: ACTIVE    |
|                     | Plate: KT-18 | 2021 Peterbilt 579| Tire: 295/75R22.5 Steer         | Status: ACTIVE    |
+---------------------+-----------------------------------------------------------------------------------+
```

### 6.6. Commercial Fleet Invoicing Engine (`/admin/invoices` & `/fleet-dashboard/invoices`)

Professional multi-job invoice generator matching the verified KT Group invoice format:

```text
+---------------------------------------------------------------------------------------------------------+
| XTREME MOBILE TIRE INC.                                                      COMMERCIAL INVOICE         |
| 11815 Medway Church Loop, Manassas, VA 20109                                 Invoice #: MW-US-0002      |
| Phone: (703) 555-TIRE | Email: Payments@xtrememobiletire.com                 Date: 2026-09-16           |
|                                                                              Due Date: Net 30           |
| BILLED TO:                                                                                              |
| KT Group Logistics / Xtreme Fleet Group                                                                 |
| Fleet Code: XMT-5132 | Attn: Piratheep S.                                                               |
+---------------------------------------------------------------------------------------------------------+
| ITEM / SERVICE DESCRIPTION            | VEHICLE / PLATE | TIRE SPEC      | QTY | UNIT PRICE | TOTAL     |
| ------------------------------------- | --------------- | -------------- | --- | ---------- | --------- |
| Emergency Roadside Steer Tire Replacement | KT-15       | 11R22.5 Virgin |  1  | $ 420.00   | $ 420.00  |
| Roadside Service Callout & Labor Fee  | KT-15           | Roadside       |  1  | $ 120.00   | $ 120.00  |
| Dual Valve Stem Replacement           | KT-18           | High Pressure  |  2  | $  25.00   | $  50.00  |
+---------------------------------------------------------------------------------------------------------+
| NOTES & REMITTANCE INSTRUCTIONS:                                  Subtotal:                 $ 590.00 USD|
| Direct Bank Wire or E-Transfer: Payments@xtrememobiletire.com      Tax Toggle [x] Exempt (0%): $   0.00 USD|
| Quoting Invoice Reference: MW-US-0002                             --------------------------------------|
|                                                                   TOTAL AMOUNT DUE:         $ 590.00 USD|
| [ DOWNLOAD PDF INVOICE ]           [ SEND TO PORTAL INBOX ]                 [ MARK INVOICE AS PAID ]    |
+---------------------------------------------------------------------------------------------------------+
```

### 6.7. Internal Portal Messaging & Inbox (`/fleet-dashboard/inbox`)

```text
+---------------------------------------------------------------------------------------------------------+
| FLEET PORTAL INBOX — Xtreme Fleet Group                                       Assigned: 24/7 Dispatch   |
+------------------------------------+--------------------------------------------------------------------+
| CONVERSATIONS                      | CHAT THREAD: Roadside Ticket #CA-10492 (Vehicle KT-15)             |
| ---------------------------------- | ------------------------------------------------------------------ |
| [●] Ticket #CA-10492 (Active)      | [Dispatcher - 11:20 AM]: Mobile Van #3 (Dave Miller) is 8 mins out |
| [ ] Invoice MW-US-0002 Notice      | to I-95 Exit 152 with the requested 11R22.5 tire.                  |
| [ ] Seasonal Fleet Maintenance     |                                                                    |
|                                    | [Fleet Manager - 11:22 AM]: Driver Marcus is waiting in the cab.   |
|                                    | Lug nuts are torqued to 450 ft-lbs.                                |
|                                    |                                                                    |
|                                    | [Dispatcher - 11:42 AM]: Technician has arrived on scene.          |
|                                    | Work commenced.                                                    |
|                                    | ------------------------------------------------------------------ |
|                                    | Reply: [ Type message to dispatch...           ] [ SEND (ENTER) ]  |
+------------------------------------+--------------------------------------------------------------------+
```

### 6.8. Public Landing Page Roadside Emergency Widget (`/`)

```text
+-------------------------------------------------------------------------+
| [ NEED IMMEDIATE ROADSIDE TIRE SERVICE? WE COME TO YOU 24/7 ]           |
|                                                                         |
| Your Full Name: [ Michael Vance           ] Phone: [ (416) 555-8821 ]   |
| Breakdown Location: [ Yorkdale Mall Parking Lot G, Toronto, ON ]        |
| Vehicle: [ 2021 Honda Civic       ] Tire Size: [ 215/50R17 ]            |
| Requested Service: [ Tire Repair (Plug / Bead Seal) v ]                 |
|                                                                         |
| [ REQUEST 24/7 MOBILE ROADSIDE DISPATCH ]                               |
| (Instantly enters Call Center Queue — An agent confirms ETA within 2m)  |
+-------------------------------------------------------------------------+
```

---

## 7. Frontend Code Architecture & Quality Standards

1. **Page Orchestrators Under 150 Lines:**
   - Every file in `src/pages/[PageName].tsx` acts strictly as an orchestrator (loading state, authentication guards, top-level layout composition).
2. **Directory & Component Mirroring:**
   - `src/pages/DispatchManager.tsx` delegates all sub-views to `src/components/pages/dispatchManager/`:
     - `UrgentQueueAccordion.tsx`
     - `DistanceCalculatorBox.tsx`
     - `DriverCashLedgerCard.tsx`
     - `DriverMessagingDrawer.tsx`
3. **State Management Hierarchy:**
   - **Local State (`useState` / `useReducer`):** Form inputs, modal open/close, accordion toggles.
   - **Parent Lifted State:** Shared controls between sibling widgets.
   - **TanStack Query v5:** All server data, cached with background revalidation on window focus.
   - **Zustand:** Global persistent UI settings (active region `countryCode`, agent active/inactive presence toggle, audio alert triggers).
4. **Accessibility (WCAG 2.2 AAA Standards):**
   - High-contrast text ratio $\ge 7:1$ on primary emergency actions.
   - Mobile touch targets $\ge 48\text{px} \times 48\text{px}$ for outdoor technician gloved use.
   - All modals trap focus and support `Esc` to close.
   - Full support for `prefers-reduced-motion`.
