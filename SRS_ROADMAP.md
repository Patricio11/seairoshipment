# SRS APP - ENTERPRISE ROADMAP (v6.0)
**Project:** Seairo Cargo Solutions (SRS) - Logistics Operating System
**Strategy:** "The Digital Twin of Cold Chain."
**Goal:** A fully immersive, interactive logistics ERP.

---

## 💎 PHASE 1: THE VISUAL OS (Frontend & Architecture)
*Goal: Build the complete visual experience for the CLIENT. Production-grade UI with mock data.*

### Task 1.1: The "Digital Twin" Landing Page
*The public face. Must distinguish SRS from standard freight forwarders.*
- [x] **Hero Engine:** Implement `react-three-fiber` to render a 3D reefer container floating in an ocean environment.
- [x] **Value Prop Cards:** Glassmorphic cards (`backdrop-blur-xl`) detailing:
    - "LCL Consolidation" (Icon: Layers)
    - "IoT Temperature Tracking" (Icon: Thermometer)
    - "Automated Compliance" (Icon: Shield Check)
- [x] **Auth Entry:** A slide-over panel for Login/Sign Up that preserves the 3D background.

### Task 1.2: The Dashboard Shell (The "OS")
*The User cannot book if not authenticated. This is their daily workspace.*
- [x] **App Shell Architecture:**
    - **Sidebar (Desktop):** Collapsible (Icon only vs Full Text). Glassmorphism effect (`bg-slate-900/95`).
    - **Mobile Navigation:** Bottom Sheet / Hamburger menu with smooth slide-in.
    - **Global Search:** "Cmd+K" style search bar to find any Container, Invoice, or Date instantly.
- [x] **Menu Structure:**
    1.  **Overview:** (Widgets: Active Shipments, Weather at Destination, Next Cut-off).
    2.  **New Booking:** (The 3D Container Wizard).
    3.  **My Shipments:** (Kanban Board: Booked -> Inspection -> Sailing -> Arrived).
    4.  **Documents:** (Digital Vault for Invoices/CoAs/HBLs).
    5.  **Finance:** (Invoices Due, Payment History, Split-Payment Status).
    6.  **Settings:** (Company Profile, Notification Prefs).

### Task 1.3: The "Overview" Command Center
*The default landing view. High density, actionable data.*
- [x] **Widget A: "Next Cut-Off" Countdown:**
    - Visual circular progress bar.
    - Logic: `Time Remaining until Friday 12:00` (NRCS Deadline).
- [x] **Widget B: Weather API Integration:**
    - Fetch weather for "Cape Town" (Origin) and "London/Ashdod" (Destination).
- [x] **Widget C: Active Shipments Grid:**
    - Columns: Ref #, Route, Status (Badge), Temp (Live Mock).
    - Status Badges: `AnimatePulse` effect for "Sailing".

### Task 1.4: The "Mind-Blowing" 3D Booking Wizard
*The core USP. This replaces the boring form.*
- [x] **Step 1: The 3D Container (The "Tetris" Engine):**
    - **Tech:** `react-three-fiber` (Canvas).
    - **Interaction:** A slider input `[5 - 20]`.
    - **Animation:** As slider moves, 3D pallet blocks *fly* into the container slots using `useSpring`.
    - **Feedback:**
        - 1-4 Pallets: Container turns **Red** (Text: "Min 5 Required").
        - 5-19 Pallets: Blocks are **Blue** (Frost effect).
        - 20 Pallets: Blocks turn **Green** (Full Capacity).
- [x] **Step 2: Route & Date (The Filter):**
    - **Visual:** Mapbox GL element zooming from CPT to Destination.
    - **Logic:** DatePicker must `disabled={(date) => isFriday(date) || differenceInDays(date, today) < 21}`.
- [x] **Step 3: Docs & Review:**
    - **UI:** A "Scanner" animation that scans the file icon when dropped.
    - **Fields:** Consignee Name & Address.

### Task 1.5: The "Shipments" Kanban Board
*Visualizing the flow of goods.*
- [x] **Kanban Layout:** Drag-and-drop board with columns: `Booked`, `Inspection`, `Sailing`, `Arrived`, `Delivered`.
- [x] **Cards:** High-detail cards showing Ref #, Vessel Name, ETA, and Status Badge.
- [x] **Filters:** Filter by Route, Status, or Date Range.

### Task 1.6: The "Digital Vault" (Documents)
*A secure, organized repository for all trade documentation.*
- [x] **Document Grid:** Filterable grid of all documents (Invoices, CoAs, HBLs, Packing Lists).
- [x] **Preview Mode:** PDF Previewer / Lightbox.
- [x] **Upload Center:** Global upload button to add missing docs to specific shipments.

### Task 1.7: Financial Hub
*Transparency in billing.*
- [x] **Invoice Dashboard:** List of all invoices with status (PAID, DUE, OVERDUE).
- [x] **Split-Payment Tracker:** Visual tracker for Deposit (60%) vs Final (40%) payments.
- [x] **Statements:** Downloadable monthly statements.

### Task 1.8: Settings & Profile
*User management and preferences.*
- [x] **Company Profile:** Manage company details (VAT, Reg Number).
- [x] **Notification Preferences:** Toggle valid alerts (Email/SMS/WhatsApp).
- [x] **Account Management:** Password reset, 2FA setup (Mock UI).

### Task 1.9: Admin Master Data Management (UI)
*Goal: Visual interface for managing the core logistics data (The "God Mode" Prep).*
- [x] **Admin Layout:** Dedicated Admin Sidebar and Shell (`/admin`).
- [x] **Locations Manager:** UI to add/edit Ports (Origin/Dest) and associated metadata.
- [x] **Fleet & Container Manager:** Manage Vessel schedules, Container availability, and Temperature defaults per route.
- [x] **Commodity Registry:** Manage commodities, HS Codes, and specific handling requirements.
- [x] **User Management (Vetting):** Review new signups, Approve/Reject workflows, and Assign Interest Rates.
- [x] **Shipment Control Tower:** Global view of all 3rd party logistics (Master Bills, House Bills, Container Tracking).
- [x] **Admin Finance:** Global view of Invoices (Overdue/Paid), Revenue Stats, and Forex settings.

---

## ⚙️ PHASE 2: THE LOGIC ENGINE (Backend & Data)
*Goal: The Brain of the system. Robust, secure, and state-aware.*

### Task 2.1: Advanced Database Schema (Drizzle)
*Implement a relational schema that handles the complexity of logistics.*
- [ ] **Users Table:** Extended with `accountNumber`, `isVetted`, `companyReg`, `vatNumber`.
- [ ] **Commodities Table:** `name`, `hsCode` (0303.66), `minTemp`, `riskLevel`.
- [ ] **Sailings Table:** `vesselName`, `voyageRef`, `etd`, `eta`, `status` (OPEN/CLOSED/SAILING).
- [ ] **Bookings Table:** `ref` (SCR-123), `palletCount`, `status` (PENDING/CONFIRMED/SHIPPED), `splitPaymentStatus` (DEPOSIT/FULL).
- [ ] **Documents Table:** `type` (INVOICE/COA/HBL), `url`, `status` (PENDING/APPROVED/REJECTED).

### Task 2.2: The "State Machine" Logic
*Logistics is a state machine. Build the transitions.*
- [ ] **Booking State Machine:**
    - `DRAFT` -> `SUBMITTED` (triggers 60% Deposit Invoice)
    - `DEPOSIT_PAID` -> `CONFIRMED` (triggers Ops Notification)
    - `INSPECTED` -> `LOADED` (triggers TIVE Activation)
    - `ARRIVED` -> `DELIVERED` (triggers 40% Final Invoice)
- [ ] **Data Validation Engine:**
    - **Pallet Logic:** Min 5, Max 20 (40ft). 1m x 1.2m x 1.8m dimensions.
    - **Pricing:** `(BaseRate * Pallets) + (FuelSurcharge * ROE * 1.20)`.
    - **Integrations:** Stub endpoints for `Meatship.ai` and `Metaship.ai`.
- [ ] **Server Actions:**
    - `submitBooking(formData)`: Validates 21-day rule, Friday rule, and Palette capacity.
    - `uploadDocument(file)`: Uploads to S3/UploadThing and updates Doc Status.

### Task 2.3: Financial Calculation Engine
- [ ] **Cost Calculator:**
    - Logic: `(BaseRate * Pallets) + (FuelSurcharge * ROE * 1.20)`.
    - Fetch Live ROE (Rate of Exchange) from external API (mock for now).
- [ ] **Invoice Generator:**
    - Server-side PDF generation using `react-pdf/renderer`.
    - Server-side PDF generation using `react-pdf/renderer`.
    - Generates **60% Deposit Invoice** immediately upon booking submission.
    - Generates **40% Balance Invoice** upon arrival at destination.

---

## 🛡️ PHASE 3: THE ADMIN "GOD MODE" (Operational Portal)
*Goal: A completely separate interface for Seairo/Savino staff to manage the chaos.*

### Task 3.1: Admin Shell & Auth
- [ ] **Separate Route:** `/admin/*` protected by `role === 'ADMIN'`.
- [ ] **Admin Sidebar:**
    - **Mission Control:** (Global Map of all cargo).
    - **Vetting Queue:** (New Signups).
    - **Load Planning:** (Container Optimization).
    - **Financials:** (Overdue Invoices).

### Task 3.2: The Vetting System
- [ ] **UI:** Split screen. Left: User Application (Docs). Right: Action Panel (Approve/Reject).
- [ ] **Action:** "Approve" triggers system to:
    - Generate unique Account Number (e.g., `ACC-2024-001`).
    - Send "Welcome & Rate Card" email.
    - Enable "New Booking" access in User Dashboard.

### Task 3.3: The "Load Planner" (Tetris for Admins)
- [ ] **Visual Interface:**
    - Select a Sailing (e.g., MSC Orchestra).
    - View a 40ft Container Grid.
    - **Drag & Drop:** Drag booked pallets from the "Pending List" into the Container Slots.
    - **Validation:** Prevent over-booking (Max 20 pallets).
- [ ] **Manifest Generation:** One-click "Download Manifest" PDF for the warehouse.

### Task 3.4: Document Compliance Hub
- [ ] **Traffic Light System:**
    - List all active shipments.
    - **Red:** Missing HBL or CoA.
    - **Green:** All docs present.
- [ ] **Bulk Upload:** Admin uploads the Master Bill of Lading (MBL) which auto-links to all House Bills (HBL).

---

## 🔗 PHASE 4: WORLD CLASS INTEGRATIONS
*Goal: Automate the manual work.*

### Task 4.1: Metaship Two-Way Sync
- [ ] **Pull:** Cron job (Vercel Cron) runs every 24h to fetch Sailing Schedules from Metaship API.
- [ ] **Push:** When Admin clicks "Finalize Load Plan", POST the manifest to Metaship.

### Task 4.2: TIVE IoT Webhooks
- [ ] **Endpoint:** `POST /api/webhooks/tive`
- [ ] **Logic:** Receive temp payload. If `temp > -18.0`, trigger `sendAlertEmail()`.
- [ ] **Frontend:** Render a Recharts Line Graph on the User's Shipment Detail page.

### Task 4.3: Meatship.ai Integration (The Brain)
*Goal: Sync Bookings and Documents with the core ops system.*
- [ ] **Booking Push:** When User clicks "Submit", POST booking payload to Meatship.
- [ ] **Shipment Pull:** Webhook listener for "Shipment Created" events from Meatship (returning the Master Ref).
- [ ] **Doc Sync:** Two-way sync of CoAs, HBLs, and Invoices.

---

## 💰 PHASE 5: FINANCIAL AUTOMATION & NOTIFICATIONS
*Goal: Get paid faster.*

### Task 5.1: The "Payment Chaser" Bot
- [ ] **Logic:** Cron job checks for `status === ARRIVED` and `paymentStatus !== FULL`.
- [ ] **Action:** Sends automated "Cargo Arrived - Please Settle Balance" emails via Resend.

### Task 5.2: In-App Notification Center
- [ ] **UI:** Bell Icon in the top bar.
- [ ] **Real-time:** Use Supabase Realtime or Polling to show "New Document Uploaded" or "Inspection Passed" alerts.