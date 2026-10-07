

# **System Design & Structural Requirements Specification**

CRM Job Management, Triage Workflow, and Proximity Dispatch Module

| Property | Details |
| :---- | :---- |
| Document Version | 1.0.0 |
| Technical Lead | [Amir H.](mailto:amirhamzaabf@gmail.com) |
| Target Completion Date | Date |
| Architecture Status | Under Review |

# **1\. Overview & Operational Shift**

# **1.1 Dialer Scope Revision**

The system architecture delegates all inbound and outbound telephony dialing capabilities to an external platform operated by the partner/parent organization.

* **External Telephony:** Voice communication, call queues, and automated dialing logic reside strictly within the external partner dialer interface.

* **CRM Core Focus:** The internal CRM refactors its operational boundaries to specialize exclusively in high-performance Create, Read, Update, and Delete (CRUD) operations for job lifecycles, account management, dispatch optimization, fleet operations, call agents, technicians, GMs, Owners, and VA agents.  
* **Data Mining, Multi-Role Lead Uploading & Outbound Operations:** Lead generation is powered by structured data mining. It is **not** restricted solely to Virtual Assistants—**Owners (Admins)**, **General Managers (GMs / Dispatch Managers)**, and **Virtual Assistants (VAs)** can all perform data mining and upload bulk lead files (.csv, .xlsx, .xls) into the CRM.
  * **Role-Based Upload Access:** The Lead Ingestion interface (`/leads/upload`, backward-compatible with `/va-upload`) is accessible to Owner, GM, and VA roles.
  * **Attribution & Commission Rules:** Every imported batch records the uploader (`uploadedById`). If uploaded by a VA, the lead is tagged for VA commission tracking upon conversion to a B2B Fleet Account ($2–$3 per completed job via `FleetCommissionLedger`). If uploaded by the Owner or GM, the lead is classified as company-mined/internal sourcing with zero third-party commission liabilities.
  * **Outbound Call Queue Workflow:** Outbound agents and VAs work through an Outbound Call Queue page (`/outbound` or `/leads/queue`, styled identically to the unassigned jobs board) using a 5-cap FIFO queue with automatic replenishment, conducting callbacks and logging call dispositions alongside standard inbound handling. Telephony execution is performed via the external partner dialer.

# **1.2 Core Objective**

The primary objective of this system update is to modernize internal navigation, implement structured job classification logic, establish a secure web booking verification pipeline, and integrate location-based dispatch services to support both retail standard operations and commercial fleet accounts.

# **2\. Job Classification & UI Navigation Changes**

To streamline workflow efficiency for Dispatchers, Owners, and Administrators, the user interface enforces strict segmentation across standard customer service calls, contracted fleet accounts, and web-submitted service bookings.

| UI Route | Target Audience | Data Scope | Key Functional Capabilities |
| :---- | :---- | :---- | :---- |
| `/jobs` | Standard & Walk-In Customers | Individual retail jobs, direct call-in requests, general service standard pricing | Job creation, standard status tracking, direct manual dispatch, payment processing |
| `/fleet-jobs` | Commercial Fleet Clients | Contracted fleet accounts, recurring corporate clients | Fleet Service Level Agreement (SLA) tracking, contracted tier pricing, dedicated driver assignment |
| `/bookings` | Web Ingress Triage | Unverified web-submitted service requests | Verification queue, customer detail validation, location confirmation, approval/rejection pipeline |

# **2.1 Route & View Specifications**

## **Standard Jobs Page (`/jobs`)**

* Manages standard individual customer service profiles and immediate service requests originating from inbound calls, created or filled by agents (such as dispatchers, VA agents, or admins) on behalf of customers.  
* Uses standard retail rate cards and default operational workflows.

## **Fleet Jobs Page (`/fleet-jobs`)**

* Encapsulates all job activities associated with corporate fleet partners.  
* Automatically enforces contracted fleet pricing matrixes and SLA completion timers.  
* Filters driver selection to personnel holding specific fleet clearances or certifications.

## **Bookings Page (`/bookings`)**

* Functions as an isolated operational triage zone for job requests originating from public web forms.  
* Prevents unverified or fraudulent requests from entering the active operational dispatch grid.

# **3\. Web Booking Verification Workflow**

The web booking pipeline enforces a strict multi-stage verification sequence before web submissions are elevated to active operational jobs.\[ Public Web Form Submission \]

               │

               ▼

   \[ Ingress: /bookings Queue \]

               │

               ▼

\[ Verification Stage: Dispatcher Validation \]

   ├── Confirm Contact & Location Data

   ├── Validate Requested Services

   └── Check Fleet or Standard Eligibility

               │

               ▼

  \[ Approved & Transitioned \]

               │

               ▼

   \[ Active Job: /jobs or /fleet-jobs \]

# **3.1 Pipeline Stages**

## **Stage 1: Ingress**

* Public website requests enter the system API and land immediately in the **Bookings** (`/bookings`) staging table.  
* The system assigns a pending triage status and generates an initial timestamp.

## **Stage 2: Verification Review**

* Dispatchers, Owners, or Managers review queued items within the verification interface.  
* **Validation Tasks:**  
  * Verify customer phone number and contact details.  
  * Confirm physical address geocoding and accessibility.  
  * Validate requested service type against current operational capacity.

## **Stage 3: Transition to Active Job**

* Upon validation, the user approves the booking request.  
* The system converts the record into an active job and assigns it to either `/jobs` or `/fleet-jobs` based on account classification.  
* The job becomes instantly visible on the active dispatch grid for driver assignment.

# **4\. Mapbox Integration & Dispatch Calculations**

The system incorporates Mapbox platform services to deliver proximity calculations, dynamic ETA generation, and route estimation during the single-view job assignment process, rather than performing live real-time GPS tracking.

# **4.1 Proximity Engine Architecture**

* **Geocoding & Search API:** Resolves customer addresses into precise latitude/longitude coordinates via Mapbox address autocomplete during job creation or booking verification.  
* **Matrix API:** Computes driving distance and travel duration between the job location and all active, available driver units using Mapbox Matrix API.

# **4.2 One-Time Dispatch ETA Calculation**

* **Traffic Snapshot Integration:** Queries the Mapbox Directions API using traffic layers to assess road congestion and current travel times at the moment of job lookup.  
* **Driver Location Snapshot:** Captures the current recorded GPS coordinates of active driver units at the time of assignment to evaluate proximity to the job.  
* **Vehicle Operational Status & Capacity:** Combines vehicle readiness metrics—such as current job assignment status, remaining driver shift limits, and vehicle capability restrictions—to prevent unrealistic assignment suggestions.  
* **Single-View Calculation:** Evaluates traffic conditions, captured GPS coordinates, and driver availability within Mapbox's routing engine to compute job dispatch recommendations upon viewing.

# **4.3 Dispatcher Interface Capabilities**

* **Proximity Sorting:** Dynamically orders active, available drivers based on estimated arrival time to the selected service location. Dispatchers can toggle filters by driver skills, vehicle class, or working shift constraints.  
* **Static Map & Routing View:** Opens a Mapbox map view when a dispatcher selects a job to review current driver locations, estimated arrival times, and potential route delays at that single point in time.  
* **One-Click Assignment:** Streamlines job dispatching by enabling dispatchers to assign jobs directly from the proximity panel. Upon confirmation, the system automatically pushes job details to the driver's mobile device and notifies the customer with an updated ETA.

