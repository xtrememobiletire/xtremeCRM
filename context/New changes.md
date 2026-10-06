

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
* **CRM Core Focus:** The internal CRM refactors its operational boundaries to specialize exclusively in high-performance Create, Read, Update, and Delete (CRUD) operations for job lifecycles, account management, dispatch optimization, and fleet operations, agent , technician , VA agent.

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

# **4\. Google Maps API Integration & Intelligent Dispatch**

The system incorporates Google Maps platform services to deliver proximity calculations, dynamic ETA generation, and real-time route optimization for dispatch operations.

# **4.1 Proximity Engine Architecture**

* **Geocoding & Places API:** Resolves customer addresses into precise latitude/longitude coordinates during job creation or booking verification.  
* **Distance Matrix API:** Computes driving distance and travel duration between the job location and all active, available driver units.

# **4.2 Dynamic ETA Calculation**

* **Driver Location Feeds:** Ingests live telemetry from driver devices.  
* **Real-time Routing Context:** Calculates live ETAs by factoring in current traffic conditions, driver proximity, and vehicle assignment status.

# **4.3 Dispatcher Interface Capabilities**

* **Proximity Sorting:** Displays a auto-sorting list of available drivers ordered by shortest arrival time to the targeted service location.  
* **Live ETA Display:** Visualizes real-time ETA updates alongside driver metadata (e.g., current load, status, vehicle type).  
* **One-Click Assignment:** Enables dispatchers to execute quick assignments directly from the proximity panel.

