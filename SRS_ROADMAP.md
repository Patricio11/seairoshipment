# SRS APP - ENTERPRISE ROADMAP (v7.0)
**Project:** Seairo Cargo Solutions (SRS) - Logistics Operating System  
**Strategy:** "The Digital Twin of Cold Chain."  
**Goal:** A fully immersive, interactive logistics ERP with world-class financial automation.

---

## 🎯 EXECUTIVE SUMMARY

This roadmap defines the complete development path for SRS, a premium cold chain logistics platform. The system handles:
- **Client Portal:** Booking, tracking, document management, and payment
- **Admin Portal:** Rate management, vetting, load planning, and compliance
- **Financial Engine:** Multi-currency pricing, split payments, and automated invoicing

### Core Business Rules
| Rule | Description |
|------|-------------|
| **Friday Rule** | No bookings on Fridays (NRCS cut-off) |
| **21-Day Rule** | Minimum 21 days advance booking required |
| **Pallet Capacity** | 40ft HC: Min 5, Max 20 pallets (1m × 1.2m × 1.8m) |
| **Payment Split** | 60% Deposit on booking, 40% Balance on arrival |
| **Document Compliance** | NRCS/PPECB docs mandatory before "Sailing" status |

---

## 💎 PHASE 1: THE VISUAL OS (Frontend & Architecture)
*Goal: Build the complete visual experience for the CLIENT. Production-grade UI with mock data.*

### ✅ Task 1.1: The "Digital Twin" Landing Page
*The public face. Must distinguish SRS from standard freight forwarders.*
- [x] **Hero Engine:** Implement `react-three-fiber` to render a 3D reefer container floating in an ocean environment.
- [x] **Value Prop Cards:** Glassmorphic cards (`backdrop-blur-xl`) detailing:
    - "LCL Consolidation" (Icon: Layers)
    - "IoT Temperature Tracking" (Icon: Thermometer)
    - "Automated Compliance" (Icon: Shield Check)
- [x] **Auth Entry:** A slide-over panel for Login/Sign Up that preserves the 3D background.

### ✅ Task 1.2: The Dashboard Shell (The "OS")
*The User cannot book if not authenticated. This is their daily workspace.*
- [x] **App Shell Architecture:**
    - **Sidebar (Desktop):** Collapsible (Icon only vs Full Text). Glassmorphism effect (`bg-slate-900/95`).
    - **Mobile Navigation:** Bottom Sheet / Hamburger menu with smooth slide-in.
    - **Global Search:** "Cmd+K" style search bar to find any Container, Invoice, or Date instantly.
- [x] **Menu Structure:**
    1. **Overview:** (Widgets: Active Shipments, Weather at Destination, Next Cut-off).
    2. **New Booking:** (The 3D Container Wizard).
    3. **My Shipments:** (Kanban Board: Booked -> Inspection -> Sailing -> Arrived).
    4. **Documents:** (Digital Vault for Invoices/CoAs/HBLs).
    5. **Finance:** (Invoices Due, Payment History, Split-Payment Status).
    6. **Settings:** (Company Profile, Notification Prefs).

### ✅ Task 1.3: The "Overview" Command Center
*The default landing view. High density, actionable data.*
- [x] **Widget A: "Next Cut-Off" Countdown:** Visual circular progress bar. Logic: `Time Remaining until Friday 12:00` (NRCS Deadline).
- [x] **Widget B: Weather API Integration:** Fetch weather for "Cape Town" (Origin) and "London/Ashdod" (Destination).
- [x] **Widget C: Active Shipments Grid:** Columns: Ref #, Route, Status (Badge), Temp (Live Mock). Status Badges: `AnimatePulse` effect for "Sailing".

### ✅ Task 1.4: The "Mind-Blowing" 3D Booking Wizard
*The core USP. This replaces the boring form.*
- [x] **Step 1: The 3D Container (The "Tetris" Engine):** `react-three-fiber` with slider input [5-20], animated pallet blocks using `useSpring`, color feedback (Red/Blue/Green).
- [x] **Step 2: Route & Date (The Filter):** Mapbox GL element, DatePicker with Friday/21-day validation.
- [x] **Step 3: Docs & Review:** Scanner animation, Consignee fields.

### ✅ Task 1.5-1.8: Dashboard Features
- [x] **Shipments Kanban Board:** Drag-and-drop with columns: Booked, Inspection, Sailing, Arrived, Delivered.
- [x] **Digital Vault:** Document grid, PDF preview, upload center.
- [x] **Financial Hub:** Invoice dashboard, split-payment tracker, downloadable statements.
- [x] **Settings & Profile:** Company profile, notification preferences, account management.

### ✅ Task 1.9: Admin Master Data Management (UI)
*Goal: Visual interface for managing the core logistics data (The "God Mode" Prep).*
- [x] **Admin Layout:** Dedicated Admin Sidebar and Shell (`/admin`).
- [x] **Locations Manager:** UI to add/edit Ports (Origin/Dest) and associated metadata.
- [x] **Fleet & Container Manager:** Manage Vessel schedules, Container availability, and Temperature defaults per route.
- [x] **Commodity Registry:** Manage commodities, HS Codes, and specific handling requirements.
- [x] **User Management (Vetting):** Review new signups, Approve/Reject workflows, and Assign Interest Rates.
- [x] **Shipment Control Tower:** Global view of all 3rd party logistics (Master Bills, House Bills, Container Tracking).
- [x] **Admin Finance:** Global view of Invoices (Overdue/Paid), Revenue Stats, and Forex settings.

### Task 1.10: Finance Core - Rate Management UI (Mock Data)
*Goal: Complete visual interface for managing the pricing engine. All data is mocked for UI/UX validation.*

#### 1.10.1 Admin Finance Navigation Update
- [ ] **Sidebar Enhancement:** Add "Rate Management" section to Admin Sidebar with sub-items:
  ```
  📊 Admin Dashboard
  ├── 💰 Finance
  │   ├── Overview (existing)
  │   ├── Invoices (existing)
  │   └── Rate Management ← NEW
  │       ├── Sales Rate Types
  │       ├── Origin Charges (SA Landsides)
  │       ├── Ocean Freight
  │       ├── Destination Charges (DAP)
  │       ├── Exchange Rates
  │       └── Finance Settings
  ```

#### 1.10.2 Sales Rate Types Manager UI
*Configure product types like SRS (Shared Reefer Services) and SCS.*
- [ ] **List View (`/admin/finance/rate-types`):**
  - DataTable with columns: Code, Name, Description, Status, Actions
  - Status toggle (Active/Inactive) with confirmation modal
  - Search and filter functionality
  - "Add New Rate Type" button
- [ ] **Create/Edit Modal:**
  - Form fields: Code (uppercase, 3-5 chars), Name, Description
  - Active toggle
  - Form validation with inline errors
- [ ] **Mock Data:**
  ```typescript
  const mockSalesRateTypes = [
    { id: '1', code: 'SRS', name: 'Shared Reefer Services', description: 'LCL consolidation service for refrigerated cargo', active: true },
    { id: '2', code: 'SCS', name: 'Seairo Cargo Solutions', description: 'Full container load service', active: false },
  ];
  ```
- [ ] **Design Specs:**
  - Use `shadcn/ui` DataTable with sorting
  - Status badges: Green (Active), Gray (Inactive)
  - Glassmorphism cards consistent with dashboard style

#### 1.10.3 Origin Charges Manager UI (SA Landsides)
*Manage all charges incurred at South African origin ports.*
- [ ] **List View (`/admin/finance/origin-charges`):**
  - Card-based layout showing rate cards
  - Each card displays: Origin, Container Type, Effective Dates, Status, Item Count, Total
  - Filter bar: Origin (dropdown), Container Type, Date Range, Status
  - "Create New Rate Card" button
- [ ] **Rate Card Detail/Edit View (`/admin/finance/origin-charges/[id]`):**
  - **Header Section:**
    - Origin selector (Cape Town, Durban)
    - Container selector (40ft HC Reefer, 40ft Reefer, 20ft Reefer, etc.)
    - Effective date range picker
    - Sales rate type selector (SRS, SCS)
    - Active toggle
  - **Charge Items Table:**
    - Columns: Category, Charge Name, Code, Type, Unit Cost (ZAR), Container Cost (ZAR), Mandatory, Actions
    - Inline editing with click-to-edit
    - Drag handle for reordering (react-beautiful-dnd)
    - Add new item row at bottom
    - Delete with confirmation
  - **Category Grouping:**
    - Collapsible sections by category (Collection, Storage, Handling, etc.)
    - Category subtotals
  - **Summary Panel (Sticky Sidebar):**
    ```
    ┌─────────────────────────────────┐
    │  RATE CARD SUMMARY              │
    │  ─────────────────────────────  │
    │  Origin: Cape Town              │
    │  Container: 40ft HC Reefer      │
    │  Effective: 01 Jan - 31 Dec 24  │
    │  ─────────────────────────────  │
    │  Per Pallet Charges:  R 1,244.25│
    │  Per Container:       R76,861.67│
    │  ─────────────────────────────  │
    │  Cost/Pallet (20):    R 3,843.08│
    │  ─────────────────────────────  │
    │  [Save Draft] [Publish]         │
    └─────────────────────────────────┘
    ```
- [ ] **Mock Data (from Screenshot 1):**
  ```typescript
  const mockOriginCharges = {
    id: '1',
    salesRateTypeId: '1', // SRS
    originId: 'cpt',
    originName: 'Cape Town',
    containerId: '40ft-reefer-hc',
    containerSize: '40FT',
    containerType: 'REEFER',
    containerVariant: 'HC',
    containerDisplayName: '40ft HC Reefer',
    effectiveFrom: '2024-01-01',
    effectiveTo: '2024-12-31',
    currency: 'ZAR',
    active: true,
    items: [
      { id: '1', category: 'COLLECTION', code: 'COLLECTION', name: 'Collection in/around Cape Town', chargeType: 'PER_CONTAINER', unitCost: null, containerCost: 10000.00, mandatory: true, sortOrder: 1 },
      { id: '2', category: 'STORAGE', code: 'COLD_STORAGE', name: 'Cold storage per week and part thereof', chargeType: 'PER_PALLET', unitCost: 335.00, containerCost: 6700.00, mandatory: true, sortOrder: 2 },
      { id: '3', category: 'HANDLING', code: 'HANDLING', name: 'Handling in and out', chargeType: 'PER_PALLET', unitCost: 130.00, containerCost: 2600.00, mandatory: true, sortOrder: 3 },
      { id: '4', category: 'TRANSPORT', code: 'TRANSPORT_TBP', name: 'Transport - Table Bay to port', chargeType: 'PER_PALLET', unitCost: 260.00, containerCost: 5200.00, mandatory: true, sortOrder: 4 },
      { id: '5', category: 'TRANSPORT', code: 'FUEL_SURCHARGE', name: 'Fuel Surcharge', chargeType: 'FIXED', unitCost: null, containerCost: null, mandatory: false, sortOrder: 5 },
      { id: '6', category: 'TRANSPORT', code: 'GENSET', name: 'Genset', chargeType: 'PER_PALLET', unitCost: 92.50, containerCost: 1850.00, mandatory: true, sortOrder: 6 },
      { id: '7', category: 'TRANSPORT', code: 'VGM', name: 'VGM', chargeType: 'PER_PALLET', unitCost: 45.00, containerCost: 900.00, mandatory: true, sortOrder: 7 },
      { id: '8', category: 'REGULATORY', code: 'TERMINAL', name: 'Terminal Handling', chargeType: 'PER_CONTAINER', unitCost: 309.40, containerCost: 6188.00, mandatory: true, sortOrder: 8 },
      { id: '9', category: 'REGULATORY', code: 'CARRIER_SVC', name: 'Carrier Service fee', chargeType: 'PER_PALLET', unitCost: 72.35, containerCost: 1447.00, mandatory: true, sortOrder: 9 },
      { id: '10', category: 'REGULATORY', code: 'CARGO_DUES', name: 'Cargo Dues', chargeType: 'PER_CONTAINER', unitCost: null, containerCost: 826.67, mandatory: true, sortOrder: 10 },
      { id: '11', category: 'DOCUMENTATION', code: 'BOL_FEE', name: 'Bill of Lading Fee', chargeType: 'PER_CONTAINER', unitCost: null, containerCost: 5500.00, mandatory: true, sortOrder: 11 },
      { id: '12', category: 'REGULATORY', code: 'SEAL_FEE', name: 'Seal fee', chargeType: 'PER_CONTAINER', unitCost: null, containerCost: 350.00, mandatory: true, sortOrder: 12 },
      { id: '13', category: 'REGULATORY', code: 'NAVIS_FEE', name: 'Navis Fee', chargeType: 'PER_CONTAINER', unitCost: null, containerCost: 350.00, mandatory: true, sortOrder: 13 },
      { id: '14', category: 'DOCUMENTATION', code: 'COURIER', name: 'Courier Fee', chargeType: 'PER_CONTAINER', unitCost: null, containerCost: 850.00, mandatory: true, sortOrder: 14 },
      { id: '15', category: 'DOCUMENTATION', code: 'TRACKING', name: 'Tracking and reporting', chargeType: 'PER_CONTAINER', unitCost: null, containerCost: 1750.00, mandatory: true, sortOrder: 15 },
      { id: '16', category: 'DOCUMENTATION', code: 'DATA_LOGGER', name: 'Data Logger', chargeType: 'PER_CONTAINER', unitCost: null, containerCost: 750.00, mandatory: true, sortOrder: 16 },
      { id: '17', category: 'REGULATORY', code: 'PORT_HEALTH', name: 'Port Health Inspections', chargeType: 'PER_CONTAINER', unitCost: null, containerCost: 1200.00, mandatory: true, sortOrder: 17 },
      { id: '18', category: 'REGULATORY', code: 'PPECB', name: 'PPECB', chargeType: 'PER_CONTAINER', unitCost: null, containerCost: 1850.00, mandatory: true, sortOrder: 18 },
      { id: '19', category: 'DOCUMENTATION', code: 'EUR1', name: 'EUR 1', chargeType: 'PER_CONTAINER', unitCost: null, containerCost: 350.00, mandatory: false, sortOrder: 19 },
      { id: '20', category: 'REGULATORY', code: 'NRCS', name: 'NRCS', chargeType: 'PER_CONTAINER', unitCost: null, containerCost: 1500.00, mandatory: true, sortOrder: 20 },
      { id: '21', category: 'DOCUMENTATION', code: 'EDI_FEE', name: 'EDI Fee', chargeType: 'PER_CONTAINER', unitCost: null, containerCost: null, mandatory: false, sortOrder: 21 },
      { id: '22', category: 'CUSTOMS', code: 'CUSTOMS', name: 'Customs Clearance', chargeType: 'PER_CONTAINER', unitCost: null, containerCost: 1200.00, mandatory: true, sortOrder: 22 },
      { id: '23', category: 'INSURANCE', code: 'INSURANCE', name: 'Insurance', chargeType: 'PER_CONTAINER', unitCost: null, containerCost: 12000.00, mandatory: true, sortOrder: 23 },
      { id: '24', category: 'OTHER', code: 'AGENCY_FEE', name: 'Agency Fee', chargeType: 'PER_CONTAINER', unitCost: null, containerCost: 8000.00, mandatory: true, sortOrder: 24 },
      { id: '25', category: 'OTHER', code: 'FACILITY_FEE', name: 'Facility Fee - on 30 days', chargeType: 'PER_CONTAINER', unitCost: null, containerCost: 4500.00, mandatory: true, sortOrder: 25 },
    ],
    totals: {
      perPalletCharges: 1244.25,
      perContainerCharges: 76861.67,
      costPerPallet: 3843.08, // For 20 pallets
    }
  };
  ```
- [ ] **Design Specs:**
  - Category color coding (Transport=Blue, Regulatory=Amber, Documentation=Green, etc.)
  - Zebra striping on rows
  - Sticky header on scroll
  - Real-time total calculation as values change
  - Toast notifications on save

#### 1.10.4 Ocean Freight Manager UI
*Manage freight rates by route and shipping line.*
- [ ] **List View (`/admin/finance/ocean-freight`):**
  - DataTable with columns: Origin, Destination, Country, Shipping Line, Freight (USD), Total (USD), Total (ZAR), Status, Actions
  - Multi-select filters: Origin, Destination Country, Shipping Line
  - Bulk edit capability for BAF updates
  - "Add New Route" button
  - Export to CSV
- [ ] **Create/Edit Modal:**
  - Origin selector (Cape Town/Durban combined or separate)
  - Destination country dropdown with port auto-populate
  - Destination port selector
  - Shipping line selector (MSC, etc.)
  - Container type selector
  - Effective date range
  - **Rate Fields (USD):**
    - Base Freight
    - BAF (Bunker Adjustment Factor)
    - ISPS (Security)
    - RCG (Reefer Cargo Guarantee)
    - Other Surcharges
  - Auto-calculated Total USD
  - Exchange rate link (from Exchange Rates table)
  - Auto-calculated Total ZAR
- [ ] **Mock Data (from Screenshot 2):**
  ```typescript
  const mockOceanFreight = [
    { id: '1', origin: 'Cape Town/Durban', destinationCountry: 'UK', destinationPort: 'London Gateway', shippingLine: 'MSC', containerId: '40ft-reefer-hc', containerSize: '40FT', containerType: 'REEFER', containerVariant: 'HC', freightUSD: 4606.00, bafUSD: 882.00, ispsUSD: 15.00, rcgUSD: 42.00, otherSurchargesUSD: 55.00, totalUSD: 5600.00, exchangeRate: 15.9, totalZAR: 89040.00, active: true },
    { id: '2', origin: 'Cape Town/Durban', destinationCountry: 'UK', destinationPort: 'Immingham', shippingLine: 'MSC', containerId: '40ft-reefer-hc', containerSize: '40FT', containerType: 'REEFER', containerVariant: 'HC', freightUSD: null, bafUSD: null, ispsUSD: null, rcgUSD: null, otherSurchargesUSD: null, totalUSD: null, exchangeRate: null, totalZAR: null, active: false },
    { id: '3', origin: 'Cape Town/Durban', destinationCountry: 'Ireland', destinationPort: 'Dublin', shippingLine: 'MSC', containerId: '40ft-reefer-hc', containerSize: '40FT', containerType: 'REEFER', containerVariant: 'HC', freightUSD: 3900.00, bafUSD: 882.00, ispsUSD: 15.00, rcgUSD: 42.00, otherSurchargesUSD: 859.00, totalUSD: 5698.00, exchangeRate: 15.9, totalZAR: null, active: true },
    { id: '4', origin: 'Cape Town/Durban', destinationCountry: 'Portugal', destinationPort: 'Lexioes', shippingLine: 'MSC', containerId: '40ft-reefer-hc', containerSize: '40FT', containerType: 'REEFER', containerVariant: 'HC', freightUSD: 3950.00, bafUSD: 884.00, ispsUSD: 15.00, rcgUSD: 42.00, otherSurchargesUSD: 157.00, totalUSD: 5048.00, exchangeRate: 15.9, totalZAR: null, active: true },
    { id: '5', origin: 'Cape Town/Durban', destinationCountry: 'Italy', destinationPort: 'Genoa', shippingLine: 'MSC', containerId: '40ft-reefer-hc', containerSize: '40FT', containerType: 'REEFER', containerVariant: 'HC', freightUSD: 3700.00, bafUSD: 882.00, ispsUSD: 15.00, rcgUSD: 42.00, otherSurchargesUSD: 11.00, totalUSD: 4650.00, exchangeRate: 15.9, totalZAR: null, active: true },
    { id: '6', origin: 'Cape Town/Durban', destinationCountry: 'Belgium', destinationPort: 'Antwerp', shippingLine: 'MSC', containerId: '40ft-reefer-hc', containerSize: '40FT', containerType: 'REEFER', containerVariant: 'HC', freightUSD: null, bafUSD: null, ispsUSD: null, rcgUSD: null, otherSurchargesUSD: null, totalUSD: null, exchangeRate: null, totalZAR: null, active: false },
    { id: '7', origin: 'Cape Town/Durban', destinationCountry: 'Germany', destinationPort: 'Bremmerhaven', shippingLine: 'MSC', containerId: '40ft-reefer-hc', containerSize: '40FT', containerType: 'REEFER', containerVariant: 'HC', freightUSD: null, bafUSD: null, ispsUSD: null, rcgUSD: null, otherSurchargesUSD: null, totalUSD: null, exchangeRate: null, totalZAR: null, active: false },
    { id: '8', origin: 'Cape Town/Durban', destinationCountry: 'France', destinationPort: 'La Harve', shippingLine: 'MSC', containerId: '40ft-reefer-hc', containerSize: '40FT', containerType: 'REEFER', containerVariant: 'HC', freightUSD: 3900.00, bafUSD: 882.00, ispsUSD: 15.00, rcgUSD: 42.00, otherSurchargesUSD: 329.00, totalUSD: 5168.00, exchangeRate: 15.9, totalZAR: null, active: true },
    { id: '9', origin: 'Cape Town/Durban', destinationCountry: 'Spain', destinationPort: 'Vigo', shippingLine: 'MSC', containerId: '40ft-reefer-hc', containerSize: '40FT', containerType: 'REEFER', containerVariant: 'HC', freightUSD: null, bafUSD: null, ispsUSD: null, rcgUSD: null, otherSurchargesUSD: null, totalUSD: null, exchangeRate: null, totalZAR: null, active: false },
    { id: '10', origin: 'Cape Town/Durban', destinationCountry: 'Greece', destinationPort: 'Limassol', shippingLine: 'MSC', containerId: '40ft-reefer-hc', containerSize: '40FT', containerType: 'REEFER', containerVariant: 'HC', freightUSD: 6168.00, bafUSD: 882.00, ispsUSD: 15.00, rcgUSD: 42.00, otherSurchargesUSD: 1739.00, totalUSD: 8846.00, exchangeRate: 15.9, totalZAR: null, active: true },
    { id: '11', origin: 'Cape Town/Durban', destinationCountry: 'Spain Island', destinationPort: 'Las Palmas', shippingLine: 'MSC', containerId: '40ft-reefer-hc', containerSize: '40FT', containerType: 'REEFER', containerVariant: 'HC', freightUSD: null, bafUSD: null, ispsUSD: null, rcgUSD: null, otherSurchargesUSD: null, totalUSD: null, exchangeRate: null, totalZAR: null, active: false },
  ];
  ```
- [ ] **Design Specs:**
  - Conditional row styling: Gray background for inactive routes
  - USD amounts right-aligned with $ prefix
  - ZAR amounts right-aligned with R prefix
  - Hover state shows full breakdown tooltip
  - Quick-edit mode for BAF/surcharge updates

#### 1.10.5 Destination Charges Manager UI (DAP)
*Manage Delivered at Place charges for each destination.*
- [ ] **List View (`/admin/finance/destination-charges`):**
  - Card grid layout (similar to Origin Charges)
  - Each card shows: Destination, Currency, Total (Local), Total (ZAR), Status
  - Filter by destination, currency
  - "Create New DAP Card" button
- [ ] **Detail/Edit View (`/admin/finance/destination-charges/[id]`):**
  - **Header:**
    - Destination selector
    - Container type
    - Local currency selector (GBP, EUR, USD)
    - R.O.E (Rate of Exchange) input with auto-lookup
    - Effective date range
  - **Charge Items Table:**
    - Columns: Code, Charge Name, Amount (Local), Amount (ZAR), Actions
    - Inline editing
    - Add/Remove items
  - **Summary Panel:**
    ```
    ┌─────────────────────────────────┐
    │  DAP SUMMARY                    │
    │  ─────────────────────────────  │
    │  Destination: London Gateway    │
    │  Currency: GBP                  │
    │  R.O.E: 22.30                   │
    │  ─────────────────────────────  │
    │  Total (GBP):      £ 2,175.00   │
    │  Total (ZAR):      R 48,502.50  │
    │  ─────────────────────────────  │
    │  Per Pallet (20):  R  2,425.13  │
    │  ─────────────────────────────  │
    │  [Save] [Publish]               │
    └─────────────────────────────────┘
    ```
- [ ] **Mock Data (from Screenshot 3):**
  ```typescript
  const mockDestinationCharges = {
    id: '1',
    salesRateTypeId: '1',
    destinationId: 'lon',
    destinationName: 'London Gateway',
    containerId: '40ft-reefer-hc',
    containerSize: '40FT',
    containerType: 'REEFER',
    containerVariant: 'HC',
    containerDisplayName: '40ft HC Reefer',
    currency: 'GBP',
    exchangeRateToZAR: 22.30,
    effectiveFrom: '2024-01-01',
    effectiveTo: '2024-12-31',
    active: true,
    items: [
      { id: '1', code: 'DELIVERY_COLD', name: 'Delivery to cold store Kent', amountLocal: 560.00, amountZAR: 12488.00, sortOrder: 1 },
      { id: '2', code: 'GENSET', name: 'Genset', amountLocal: 280.00, amountZAR: 6244.00, sortOrder: 2 },
      { id: '3', code: 'DOCUMENTATION', name: 'Documentation', amountLocal: 55.00, amountZAR: 1226.50, sortOrder: 3 },
      { id: '4', code: 'PORT_CHARGES', name: 'Port Charges', amountLocal: 110.00, amountZAR: 2453.00, sortOrder: 4 },
      { id: '5', code: 'THC', name: 'THC', amountLocal: 285.00, amountZAR: 6355.50, sortOrder: 5 },
      { id: '6', code: 'CUSTOMS_ENTRY', name: 'Customs Entry', amountLocal: 400.00, amountZAR: 8920.00, sortOrder: 6 },
      { id: '7', code: 'CARRIER_TERMINAL', name: 'Carrier Terminal Fees', amountLocal: 100.00, amountZAR: 2230.00, sortOrder: 7 },
      { id: '8', code: 'UNPACK', name: 'Unpack', amountLocal: 385.00, amountZAR: 8585.50, sortOrder: 8 },
    ],
    totals: {
      totalLocal: 2175.00,
      totalZAR: 48502.50,
      perPallet: 2425.13, // For 20 pallets
    }
  };
  ```
- [ ] **Design Specs:**
  - Currency symbol displayed based on selection (£, €, $)
  - Real-time ZAR conversion as amounts change
  - Exchange rate field with "Fetch Latest" button

#### 1.10.6 Exchange Rates Manager UI
*Manage currency exchange rates for pricing calculations.*
- [ ] **Dashboard View (`/admin/finance/exchange-rates`):**
  - **Current Rates Cards (Hero Section):**
    ```
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │  USD → ZAR   │ │  GBP → ZAR   │ │  EUR → ZAR   │
    │   18.45      │ │   22.30      │ │   19.85      │
    │  ▲ +0.15     │ │  ▼ -0.05     │ │  ━ 0.00      │
    │  Updated: 2h │ │  Updated: 2h │ │  Updated: 2h │
    └──────────────┘ └──────────────┘ └──────────────┘
    ```
  - **Historical Chart:** Line chart (Recharts) showing 30-day trend for each currency
  - **Rate History Table:** DataTable with columns: Date, USD/ZAR, GBP/ZAR, EUR/ZAR, Source
- [ ] **Manual Rate Entry Modal:**
  - Currency pair selector
  - Rate input (6 decimal places)
  - Effective date picker
  - Source (Manual, SARB, API)
  - Notes field
- [ ] **Settings Panel:**
  - Auto-fetch toggle (Enable/Disable)
  - Fetch frequency (Daily at HH:MM)
  - Alert threshold (% change)
  - Notification recipients
- [ ] **Mock Data:**
  ```typescript
  const mockExchangeRates = {
    current: [
      { fromCurrency: 'USD', toCurrency: 'ZAR', rate: 18.45, source: 'SARB', effectiveDate: '2024-01-27', change: 0.15, changePercent: 0.82 },
      { fromCurrency: 'GBP', toCurrency: 'ZAR', rate: 22.30, source: 'SARB', effectiveDate: '2024-01-27', change: -0.05, changePercent: -0.22 },
      { fromCurrency: 'EUR', toCurrency: 'ZAR', rate: 19.85, source: 'SARB', effectiveDate: '2024-01-27', change: 0.00, changePercent: 0.00 },
    ],
    history: [
      { date: '2024-01-27', usdZar: 18.45, gbpZar: 22.30, eurZar: 19.85 },
      { date: '2024-01-26', usdZar: 18.30, gbpZar: 22.35, eurZar: 19.85 },
      { date: '2024-01-25', usdZar: 18.25, gbpZar: 22.40, eurZar: 19.80 },
      // ... more history
    ],
    settings: {
      autoFetchEnabled: true,
      fetchTime: '08:00',
      alertThreshold: 2.0, // percent
    }
  };
  ```
- [ ] **Design Specs:**
  - Green/Red indicators for rate changes
  - Sparkline mini-charts in rate cards
  - Rate precision: 4 decimal places displayed, 6 stored
  - "Last Updated" timestamp with relative time

#### 1.10.7 Finance Settings Manager UI
*Global financial parameters for the pricing engine.*
- [ ] **Settings View (`/admin/finance/settings`):**
  - **Form Layout:**
    ```
    ┌─────────────────────────────────────────────────────────────┐
    │  FINANCE SETTINGS                                           │
    │  ─────────────────────────────────────────────────────────  │
    │                                                             │
    │  LENDING RATES                                              │
    │  ┌─────────────────────────────────────────────────────┐   │
    │  │ Prime Lending Rate        [  11.75  ] %              │   │
    │  │ Finance Margin            [   2.00  ] %              │   │
    │  │ Effective Rate            [  13.75  ] % (calculated) │   │
    │  └─────────────────────────────────────────────────────┘   │
    │                                                             │
    │  PAYMENT TERMS                                              │
    │  ┌─────────────────────────────────────────────────────┐   │
    │  │ Deposit Percentage        [    60   ] %              │   │
    │  │ Balance Percentage        [    40   ] % (calculated) │   │
    │  │ Deposit Due (Days)        [     7   ] days           │   │
    │  │ Balance Due (Days)        [    14   ] days           │   │
    │  └─────────────────────────────────────────────────────┘   │
    │                                                             │
    │  TAX SETTINGS                                               │
    │  ┌─────────────────────────────────────────────────────┐   │
    │  │ VAT Rate                  [    15   ] %              │   │
    │  │ Default Currency          [   ZAR   ] ▼              │   │
    │  └─────────────────────────────────────────────────────┘   │
    │                                                             │
    │  EFFECTIVE FROM: [ 01 Jan 2024 ]                           │
    │                                                             │
    │  [Save Changes]                                             │
    │                                                             │
    └─────────────────────────────────────────────────────────────┘
    ```
  - **Audit Log Section:**
    - Table showing who changed what and when
    - Columns: Date, User, Field Changed, Old Value, New Value
- [ ] **Mock Data:**
  ```typescript
  const mockFinanceSettings = {
    primeLendingRate: 11.75,
    financeMargin: 2.00,
    effectiveRate: 13.75, // Calculated
    depositPercentage: 60,
    balancePercentage: 40, // Calculated (100 - deposit)
    depositDueDays: 7,
    balanceDueDays: 14,
    vatRate: 15,
    defaultCurrency: 'ZAR',
    effectiveFrom: '2024-01-01',
    updatedAt: '2024-01-15T10:30:00Z',
    updatedBy: 'admin@seairo.com',
  };
  
  const mockAuditLog = [
    { date: '2024-01-15', user: 'admin@seairo.com', field: 'primeLendingRate', oldValue: '11.50', newValue: '11.75' },
    { date: '2024-01-01', user: 'admin@seairo.com', field: 'financeMargin', oldValue: '2.50', newValue: '2.00' },
  ];
  ```
- [ ] **Design Specs:**
  - Input validation (percentages 0-100, rates 0-50)
  - Confirmation modal before saving
  - "Effective From" date must be today or future
  - Show impact preview: "This will affect X pending quotes"

#### 1.10.8 Pricing Calculator Preview (Client Booking Flow)
*Live pricing display during the booking process.*
- [ ] **Integration Point:** Step 3 of Booking Wizard (after route selection)
- [ ] **Pricing Breakdown Component:**
  ```
  ┌─────────────────────────────────────────────────────────────┐
  │  💰 ESTIMATED PRICING                                       │
  │  Route: Cape Town → London Gateway                          │
  │  Container: 40ft HC Reefer │ Pallets: [  5  ] ▼            │
  │  ─────────────────────────────────────────────────────────  │
  │                                                             │
  │  COST BREAKDOWN                           ZAR               │
  │  ┌─────────────────────────────────────────────────────┐   │
  │  │ Origin Landsides (SA)                    4,178.00    │   │
  │  │   └ Collection, Storage, Transport...               │   │
  │  │ Ocean Freight                            4,452.00    │   │
  │  │   └ Freight + BAF + Surcharges                      │   │
  │  │ Destination Charges (DAP)                2,400.00    │   │
  │  │   └ Delivery, Customs, THC...                       │   │
  │  │ ─────────────────────────────────────────────────── │   │
  │  │ Subtotal                                11,030.00    │   │
  │  │ Finance Fee (Prime + 2%)                   225.00    │   │
  │  │ ─────────────────────────────────────────────────── │   │
  │  │ COST PER PALLET                      R 11,255.00    │   │
  │  │ TOTAL (5 pallets)                    R 56,275.00    │   │
  │  └─────────────────────────────────────────────────────┘   │
  │                                                             │
  │  PAYMENT SCHEDULE                                           │
  │  ┌─────────────────────────────────────────────────────┐   │
  │  │ 🔵 Deposit (60%)           R 33,765.00   Due: 7 days │   │
  │  │ ⚪ Balance (40%)           R 22,510.00   On arrival  │   │
  │  └─────────────────────────────────────────────────────┘   │
  │                                                             │
  │  ⓘ Prices are estimates based on current rates.            │
  │    Final invoice may vary based on actual sailing date.    │
  │                                                             │
  └─────────────────────────────────────────────────────────────┘
  ```
- [ ] **Mock Calculation Logic:**
  ```typescript
  const calculatePricing = (palletCount: number, route: string) => {
    // Mock rates for Cape Town → London
    const originPerPallet = 835.60;
    const originPerContainer = 60143.67;
    const oceanFreightPerPallet = 890.40; // $5600 / 20 pallets * R18.45/USD / 20 = ~$280/pallet
    const dapPerPallet = 480.00; // R48502.50 / 20 pallets
    
    const originTotal = (originPerPallet * palletCount) + (originPerContainer * (palletCount / 20));
    const oceanTotal = oceanFreightPerPallet * palletCount;
    const dapTotal = dapPerPallet * palletCount;
    const subtotal = originTotal + oceanTotal + dapTotal;
    const financeFee = subtotal * 0.02; // 2% margin on Prime
    const total = subtotal + financeFee;
    
    return {
      origin: { perPallet: originPerPallet, total: originTotal },
      ocean: { perPallet: oceanFreightPerPallet, total: oceanTotal },
      dap: { perPallet: dapPerPallet, total: dapTotal },
      subtotal,
      financeFee,
      perPallet: total / palletCount,
      grandTotal: total,
      deposit: total * 0.6,
      balance: total * 0.4,
    };
  };
  ```
- [ ] **Design Specs:**
  - Collapsible sections for each cost category
  - Real-time recalculation as pallet count changes
  - Smooth number animation (Framer Motion)
  - Hover tooltips explaining each charge
  - "View Full Breakdown" link for detailed modal

#### 1.10.9 Invoice Preview Component
*Preview invoice format before generation (Admin & Client).*
- [ ] **Invoice Template (based on Screenshot 4):**
  ```
  ┌─────────────────────────────────────────────────────────────────┐
  │                                                                 │
  │  [SEAIRO LOGO]                                                  │
  │                                                                 │
  │  THIS IS FOR THE INVOICE FOR THE BOOKING,                       │
  │  WHICH SHOULD BE PAID 60% OF TOTAL COST                         │
  │                                                                 │
  │  ─────────────────────────────────────────────────────────────  │
  │                                                                 │
  │  SRS - Sales Rates (Shared Reefer Services) Refrigerated        │
  │  Cape Town to London                              ZAR           │
  │  ┌───────────────────────────────────────────────────────────┐ │
  │  │ Origin Landsides                         R      4,178.00  │ │
  │  │ Ocean Freight                            R      4,452.00  │ │
  │  │ Destination Charges                      R      2,400.00  │ │
  │  └───────────────────────────────────────────────────────────┘ │
  │                                                                 │
  │  Finance Fee - Prime + 2%                   R        225.00     │
  │                                                                 │
  │  ─────────────────────────────────────────────────────────────  │
  │                                                                 │
  │  Total cost per pallet            1         R     11,255.00     │
  │  Total cost of pallets            5         R     56,275.00     │
  │                                                                 │
  │  ─────────────────────────────────────────────────────────────  │
  │                                                                 │
  │  DEPOSIT (60%)                              R     33,765.00     │
  │  VAT (15%)                                  R      5,064.75     │
  │  ─────────────────────────────────────────────────────────────  │
  │  TOTAL DUE                                  R     38,829.75     │
  │                                                                 │
  └─────────────────────────────────────────────────────────────────┘
  ```
- [ ] **Component Features:**
  - Print-optimized layout
  - Download as PDF button
  - Send via email button
  - Edit mode for admins (adjust line items)
- [ ] **Design Specs:**
  - Professional typography (clean, readable)
  - SRS brand colors
  - Responsive for A4 print

#### 1.10.10 Design System Consistency Checklist
*Ensure all Finance UI matches the established design language.*
- [ ] **Color Palette:**
  - Primary: Slate-900 (backgrounds), Slate-800 (cards)
  - Accent: Blue-500 (actions), Green-500 (success), Amber-500 (warning), Red-500 (error)
  - Text: White (primary), Slate-400 (secondary)
  - Currency: Green for ZAR, Blue for USD, Purple for GBP, Amber for EUR
- [ ] **Components:**
  - All forms use `shadcn/ui` Form components
  - All tables use `shadcn/ui` DataTable with consistent styling
  - All modals use `shadcn/ui` Dialog with backdrop blur
  - All buttons follow existing dashboard patterns
  - Loading states: Skeleton components for data loading
  - Empty states: Illustrated empty state components
- [ ] **Animations:**
  - Page transitions: Framer Motion fade + slide
  - Number changes: Animated counting (react-countup)
  - Table row hover: Subtle background change
  - Toast notifications: Slide in from bottom-right
- [ ] **Spacing:**
  - Card padding: `p-6`
  - Section gaps: `gap-6`
  - Form field gaps: `gap-4`
- [ ] **Typography:**
  - Headings: `font-semibold text-xl`
  - Labels: `text-sm text-slate-400`
  - Values: `font-medium text-white`
  - Currency: `font-mono` for number alignment

---

## ⚙️ PHASE 2: THE LOGIC ENGINE (Backend & Data)
*Goal: The Brain of the system. Robust, secure, and state-aware.*

### ✅ Task 2.0: Authentication & Security Core
*Goal: Secure the platform using Better Auth and set up the environmental foundation.*
- [x] **Environment Setup:** Configure `.env.local` with DB, Auth, and API keys.
- [x] **Better Auth Integration:** Install and configure `better-auth`.
- [x] **Access Control:** Protect `/dashboard` & `/admin` via server-side Layout checks.
- [x] **User Role Logic:** Differentiate `ADMIN` vs `CLIENT` access using Better Auth roles.
- [x] **User Seeding:** Script to populate Admin/Client users via API.
- [x] **Sign-Out Functionality:** Implemented in all dashboards.
- [x] **Hydration Error Fixes:** Suppressed browser extension warnings.

### Task 2.1: Advanced Database Schema (Drizzle)
*Implement a comprehensive relational schema handling all logistics operations.*

#### 2.1.1 Master Data Tables

##### Locations Table (`locations`)
- [ ] **Fields:**
  - `id` (uuid, PK)
  - `name` (varchar) - e.g., "Cape Town", "London Gateway"
  - `code` (varchar, unique) - e.g., "ZACPT", "GBLON"
  - `country` (varchar)
  - `countryCode` (varchar) - ISO 3166-1 alpha-2
  - `type` (enum: ORIGIN | DESTINATION | HUB)
  - `portCode` (varchar, nullable) - UN/LOCODE
  - `coordinates` (json: {lat, lng})
  - `timezone` (varchar)
  - `active` (boolean, default: true)
  - `createdAt`, `updatedAt` (timestamps)
- [ ] **Admin UI:** Grid view with filters, CRUD operations, map visualization

##### Commodities Table (`commodities`)
- [ ] **Fields:**
  - `id` (uuid, PK)
  - `name` (varchar) - e.g., "Frozen Beef", "Fresh Citrus"
  - `hsCode` (varchar) - e.g., "0202.30", "0805.10"
  - `category` (varchar) - e.g., "Meat", "Seafood", "Fruit"
  - `minTemp` (decimal) - e.g., -22.0
  - `maxTemp` (decimal) - e.g., -18.0
  - `riskLevel` (enum: LOW | MEDIUM | HIGH)
  - `handlingNotes` (text)
  - `requiresCertificate` (boolean)
  - `certificateTypes` (json array) - e.g., ["CoA", "Health Certificate"]
  - `active` (boolean)
  - `createdAt`, `updatedAt`
- [ ] **Admin UI:** Table with search, temperature range display

##### Containers Table (`containers`)
- [ ] **Fields:**
  - `id` (uuid, PK)
  - `size` (enum: 20FT | 40FT) - Physical size of container
  - `type` (enum: REEFER | DRY) - Temperature controlled or standard
  - `variant` (varchar, nullable) - e.g., "HC" (High Cube), "STD" (Standard)
  - `code` (varchar, unique) - e.g., "40FT-REEFER-HC", "20FT-DRY-STD"
  - `displayName` (varchar) - e.g., "40ft HC Reefer", "20ft Dry Container"
  - `tempRangeMin` (decimal, nullable) - Only for REEFER type
  - `tempRangeMax` (decimal, nullable) - Only for REEFER type
  - `maxPallets` (integer) - 20FT: 10, 40FT: 20
  - `dimensions` (json: {length, width, height}) - Internal dimensions in meters
  - `tareWeight` (decimal) - Empty container weight in kg
  - `maxPayload` (decimal) - Maximum cargo weight in kg
  - `active` (boolean)
  - `createdAt`, `updatedAt`
- [ ] **Seed Data:**
  ```typescript
  const containerTypes = [
    { size: '20FT', type: 'REEFER', variant: 'STD', code: '20FT-REEFER-STD', displayName: '20ft Reefer', tempRangeMin: -25, tempRangeMax: 25, maxPallets: 10 },
    { size: '20FT', type: 'DRY', variant: 'STD', code: '20FT-DRY-STD', displayName: '20ft Dry Container', tempRangeMin: null, tempRangeMax: null, maxPallets: 10 },
    { size: '40FT', type: 'REEFER', variant: 'STD', code: '40FT-REEFER-STD', displayName: '40ft Reefer', tempRangeMin: -25, tempRangeMax: 25, maxPallets: 20 },
    { size: '40FT', type: 'REEFER', variant: 'HC', code: '40FT-REEFER-HC', displayName: '40ft HC Reefer', tempRangeMin: -25, tempRangeMax: 25, maxPallets: 20 },
    { size: '40FT', type: 'DRY', variant: 'STD', code: '40FT-DRY-STD', displayName: '40ft Dry Container', tempRangeMin: null, tempRangeMax: null, maxPallets: 20 },
    { size: '40FT', type: 'DRY', variant: 'HC', code: '40FT-DRY-HC', displayName: '40ft HC Dry Container', tempRangeMin: null, tempRangeMax: null, maxPallets: 20 },
  ];
  ```

#### 2.1.2 Rate Management Tables (NEW - Finance Core)

##### Sales Rate Types Table (`sales_rate_types`)
*Defines product types like SRS (Shared Reefer Services) and SCS (Seairo Cargo Solutions)*
- [ ] **Fields:**
  - `id` (uuid, PK)
  - `code` (varchar, unique) - e.g., "SRS", "SCS"
  - `name` (varchar) - e.g., "Shared Reefer Services"
  - `description` (text)
  - `active` (boolean)
  - `createdAt`, `updatedAt`

##### Origin Charges Table (`origin_charges`) - SA Landsides
*Charges incurred at origin port (Cape Town area)*
- [ ] **Fields:**
  - `id` (uuid, PK)
  - `salesRateTypeId` (FK -> sales_rate_types)
  - `originId` (FK -> locations)
  - `containerId` (FK -> containers) - Links to container size/type combination
  - `effectiveFrom` (date)
  - `effectiveTo` (date, nullable)
  - `currency` (varchar, default: "ZAR")
  - `active` (boolean)
  - `createdAt`, `updatedAt`

##### Origin Charge Items Table (`origin_charge_items`)
*Individual line items for origin charges*
- [ ] **Fields:**
  - `id` (uuid, PK)
  - `originChargeId` (FK -> origin_charges)
  - `chargeCode` (varchar) - e.g., "COLLECTION", "COLD_STORAGE"
  - `chargeName` (varchar) - e.g., "Collection in/around Cape Town"
  - `chargeType` (enum: PER_PALLET | PER_CONTAINER | FIXED)
  - `unitCost` (decimal) - Cost per pallet (if applicable)
  - `containerCost` (decimal) - Fixed container cost (if applicable)
  - `category` (enum: COLLECTION | STORAGE | HANDLING | TRANSPORT | REGULATORY | DOCUMENTATION | INSURANCE | OTHER)
  - `mandatory` (boolean)
  - `sortOrder` (integer)
  - `notes` (text, nullable)
  - `createdAt`, `updatedAt`

**Origin Charge Categories (from Screenshot 1):**
| Category | Charge Items |
|----------|--------------|
| COLLECTION | Collection in/around Cape Town |
| STORAGE | Cold storage per week and part thereof |
| HANDLING | Handling in and out |
| TRANSPORT | Transport - Table Bay to port, Fuel Surcharge, Genset, VGM |
| REGULATORY | Terminal Handling, Carrier Service Fee, Cargo Dues, Bill of Lading Fee, Seal Fee, Navis Fee |
| DOCUMENTATION | Courier Fee, Tracking and reporting, Data Logger |
| REGULATORY | Port Health Inspections, PPECB, EUR 1, NRCS, EDI Fee |
| CUSTOMS | Customs Clearance |
| INSURANCE | Insurance |
| OTHER | Agency Fee, Facility Fee - on 30 days |

##### Ocean Freight Table (`ocean_freight_rates`)
*Freight rates by route*
- [ ] **Fields:**
  - `id` (uuid, PK)
  - `salesRateTypeId` (FK -> sales_rate_types)
  - `originId` (FK -> locations) - e.g., Cape Town/Durban
  - `destinationId` (FK -> locations) - e.g., London Gateway
  - `destinationCountry` (varchar) - e.g., "UK"
  - `shippingLine` (varchar) - e.g., "MSC"
  - `containerId` (FK -> containers) - Links to container size/type combination
  - `effectiveFrom` (date)
  - `effectiveTo` (date, nullable)
  - `freightUSD` (decimal) - Base freight in USD
  - `bafUSD` (decimal) - Bunker Adjustment Factor
  - `ispsUSD` (decimal) - Security surcharge
  - `rcgUSD` (decimal) - Reefer Cargo Guarantee
  - `otherSurchargesUSD` (decimal)
  - `totalUSD` (decimal) - Computed total
  - `exchangeRateUSDZAR` (decimal) - Rate used for conversion
  - `totalZAR` (decimal) - Computed ZAR equivalent
  - `active` (boolean)
  - `createdAt`, `updatedAt`

**Ocean Freight Routes (from Screenshot 2):**
| Origin | Destination | Port | Country |
|--------|-------------|------|---------|
| Cape Town/Durban | London Gateway | GBLON | UK |
| Cape Town/Durban | Immingham | GBIMM | UK |
| Cape Town/Durban | Dublin | IEDUB | Ireland |
| Cape Town/Durban | Lexioes | PTLEI | Portugal |
| Cape Town/Durban | Genoa | ITGOA | Italy |
| Cape Town/Durban | Antwerp | BEANR | Belgium |
| Cape Town/Durban | Bremmerhaven | DEBRV | Germany |
| Cape Town/Durban | La Harve | FRLEH | France |
| Cape Town/Durban | Vigo | ESVGO | Spain |
| Cape Town/Durban | Limassol | CYLMS | Greece |
| Cape Town/Durban | Las Palmas | ESLPA | Spain (Canary Islands) |

##### Destination Charges Table (`destination_charges`) - DAP
*Charges at destination port (Delivered at Place)*
- [ ] **Fields:**
  - `id` (uuid, PK)
  - `salesRateTypeId` (FK -> sales_rate_types)
  - `destinationId` (FK -> locations)
  - `containerId` (FK -> containers) - Links to container size/type combination
  - `effectiveFrom` (date)
  - `effectiveTo` (date, nullable)
  - `currency` (varchar) - e.g., "GBP", "EUR"
  - `exchangeRateToZAR` (decimal)
  - `active` (boolean)
  - `createdAt`, `updatedAt`

##### Destination Charge Items Table (`destination_charge_items`)
*Individual line items for destination charges*
- [ ] **Fields:**
  - `id` (uuid, PK)
  - `destinationChargeId` (FK -> destination_charges)
  - `chargeCode` (varchar) - e.g., "DELIVERY", "THC"
  - `chargeName` (varchar) - e.g., "Delivery to cold store Kent"
  - `chargeType` (enum: PER_CONTAINER | FIXED)
  - `amountLocal` (decimal) - Amount in local currency (GBP/EUR)
  - `amountZAR` (decimal) - Converted to ZAR
  - `sortOrder` (integer)
  - `notes` (text, nullable)
  - `createdAt`, `updatedAt`

**Destination Charge Items (from Screenshot 3 - London Gateway):**
| Charge Code | Charge Name | Amount (GBP) |
|-------------|-------------|--------------|
| DELIVERY | Delivery to cold store Kent | 560.00 |
| GENSET | Genset | 280.00 |
| DOCUMENTATION | Documentation | 55.00 |
| PORT_CHARGES | Port Charges | 110.00 |
| THC | Terminal Handling Charge | 285.00 |
| CUSTOMS_ENTRY | Customs Entry | 400.00 |
| CARRIER_TERMINAL | Carrier Terminal Fees | 100.00 |
| UNPACK | Unpack | 385.00 |

##### Finance Settings Table (`finance_settings`)
*Global financial parameters*
- [ ] **Fields:**
  - `id` (uuid, PK)
  - `primeLendingRate` (decimal) - Current prime rate (e.g., 11.75%)
  - `financeMargin` (decimal) - Additional margin (e.g., 2%)
  - `depositPercentage` (decimal) - Default 60%
  - `balancePercentage` (decimal) - Default 40%
  - `vatRate` (decimal) - e.g., 15%
  - `defaultCurrency` (varchar) - "ZAR"
  - `effectiveFrom` (date)
  - `createdAt`, `updatedAt`

##### Exchange Rates Table (`exchange_rates`)
*Daily exchange rates for multi-currency calculations*
- [ ] **Fields:**
  - `id` (uuid, PK)
  - `fromCurrency` (varchar) - e.g., "USD", "GBP", "EUR"
  - `toCurrency` (varchar) - e.g., "ZAR"
  - `rate` (decimal)
  - `source` (varchar) - e.g., "SARB", "MANUAL"
  - `effectiveDate` (date)
  - `createdAt`

#### 2.1.3 Operational Tables

##### Sailings Table (`sailings`)
- [ ] **Fields:**
  - `id` (uuid, PK)
  - `vesselName` (varchar)
  - `voyageRef` (varchar)
  - `originId` (FK -> locations)
  - `destinationId` (FK -> locations)
  - `shippingLine` (varchar) - e.g., "MSC"
  - `etd` (datetime) - Estimated Time of Departure
  - `eta` (datetime) - Estimated Time of Arrival
  - `status` (enum: SCHEDULED | LOADING | AT_SEA | ARRIVED | COMPLETED)
  - `capacity` (integer) - Total pallet slots available
  - `bookedCapacity` (integer) - Pallets already booked
  - `cutoffDate` (datetime) - Documentation cut-off
  - `createdAt`, `updatedAt`

##### Bookings Table (`bookings`)
- [ ] **Fields:**
  - `id` (uuid, PK)
  - `ref` (varchar, unique) - e.g., "SCR-2024-0001"
  - `userId` (FK -> users)
  - `sailingId` (FK -> sailings)
  - `salesRateTypeId` (FK -> sales_rate_types) - SRS or SCS
  - `originId` (FK -> locations)
  - `destinationId` (FK -> locations)
  - `palletCount` (integer)
  - `containerId` (FK -> containers) - Links to container size/type combination
  - `status` (enum - see State Machine below)
  - `consigneeName` (varchar)
  - `consigneeAddress` (text)
  - `consigneeContact` (varchar)
  - `specialInstructions` (text, nullable)
  - `createdAt`, `submittedAt`, `confirmedAt`, `updatedAt`

##### Booking Commodities Junction (`booking_commodities`)
- [ ] **Fields:**
  - `id` (uuid, PK)
  - `bookingId` (FK -> bookings)
  - `commodityId` (FK -> commodities)
  - `palletCount` (integer)
  - `grossWeight` (decimal) - kg
  - `declaredValue` (decimal) - ZAR
  - `temperature` (decimal) - Required temp
  - `createdAt`

##### Booking Pricing Snapshot (`booking_pricing`)
*Captures the exact pricing at time of booking (historical record)*
- [ ] **Fields:**
  - `id` (uuid, PK)
  - `bookingId` (FK -> bookings)
  - `palletCount` (integer)
  - `originChargesZAR` (decimal) - Total SA Landsides
  - `oceanFreightZAR` (decimal) - Converted freight total
  - `destinationChargesZAR` (decimal) - Converted DAP total
  - `subtotalZAR` (decimal)
  - `financeFeeZAR` (decimal) - Prime + margin
  - `vatAmount` (decimal)
  - `totalPerPalletZAR` (decimal)
  - `grandTotalZAR` (decimal)
  - `depositAmount` (decimal) - 60%
  - `balanceAmount` (decimal) - 40%
  - `exchangeRates` (json) - Snapshot of rates used
  - `pricingBreakdown` (json) - Full line-item detail
  - `createdAt`

##### Documents Table (`documents`)
- [ ] **Fields:**
  - `id` (uuid, PK)
  - `bookingId` (FK -> bookings)
  - `type` (enum: INVOICE | COA | HBL | MBL | PACKING_LIST | HEALTH_CERT | NRCS | PPECB | EUR1 | OTHER)
  - `fileName` (varchar)
  - `fileUrl` (varchar) - S3/UploadThing URL
  - `fileSize` (integer) - bytes
  - `mimeType` (varchar)
  - `status` (enum: PENDING | APPROVED | REJECTED)
  - `uploadedBy` (FK -> users)
  - `uploadedAt` (timestamp)
  - `reviewedBy` (FK -> users, nullable)
  - `reviewedAt` (timestamp, nullable)
  - `rejectionReason` (text, nullable)
  - `createdAt`, `updatedAt`

#### 2.1.4 Financial Tables

##### Invoices Table (`invoices`)
- [ ] **Fields:**
  - `id` (uuid, PK)
  - `invoiceNumber` (varchar, unique) - e.g., "INV-2024-0001"
  - `bookingId` (FK -> bookings)
  - `type` (enum: DEPOSIT | BALANCE | CREDIT_NOTE | ADJUSTMENT)
  - `amount` (decimal) - Net amount
  - `vatAmount` (decimal)
  - `totalAmount` (decimal) - Gross
  - `currency` (varchar) - "ZAR"
  - `status` (enum: DRAFT | ISSUED | PAID | OVERDUE | CANCELLED | PARTIALLY_PAID)
  - `issueDate` (date)
  - `dueDate` (date)
  - `paidDate` (date, nullable)
  - `paidAmount` (decimal, default: 0)
  - `pdfUrl` (varchar, nullable)
  - `lineItems` (json) - Full breakdown
  - `notes` (text, nullable)
  - `createdAt`, `updatedAt`

##### Payments Table (`payments`)
- [ ] **Fields:**
  - `id` (uuid, PK)
  - `invoiceId` (FK -> invoices)
  - `amount` (decimal)
  - `currency` (varchar)
  - `method` (enum: EFT | CREDIT_CARD | STRIPE | MANUAL)
  - `reference` (varchar) - Payment reference
  - `status` (enum: PENDING | CONFIRMED | FAILED | REFUNDED)
  - `receivedAt` (timestamp)
  - `confirmedBy` (FK -> users, nullable)
  - `notes` (text, nullable)
  - `createdAt`, `updatedAt`

#### 2.1.5 Schema Management
- [ ] **Generate Migrations:** Run `drizzle-kit generate` for all new tables
- [ ] **Apply Schema:** Run `drizzle-kit push` to sync with database
- [ ] **Seed Master Data:**
  - Sales rate types (SRS, SCS)
  - Locations (all origins and destinations)
  - Commodities (frozen meats, seafood, fresh produce)
  - Container specifications
  - Initial rate cards for SRS
  - Finance settings (Prime rate, margins)
  - Sample exchange rates
- [ ] **Verify Relationships:** Test all FKs and cascades in Drizzle Studio

### Task 2.2: The "State Machine" Logic
*Logistics is a state machine. Build the transitions.*

#### Booking State Machine
```
DRAFT ──────────────────────────────────────────────────────────────────────►
   │
   ▼ [User clicks "Submit Booking"]
SUBMITTED ──────────────────────────────────────────────────────────────────►
   │ • Validates 21-day rule, Friday rule, pallet capacity
   │ • Creates Booking Pricing Snapshot
   │ • Generates 60% Deposit Invoice (ISSUED)
   │ • Sends "Booking Received" email
   ▼
DEPOSIT_INVOICED ───────────────────────────────────────────────────────────►
   │
   ▼ [Payment received & confirmed]
DEPOSIT_PAID ───────────────────────────────────────────────────────────────►
   │ • Updates Invoice status to PAID
   │ • Sends "Deposit Confirmed" email
   │ • Triggers Ops notification
   ▼
CONFIRMED ──────────────────────────────────────────────────────────────────►
   │ • Booking visible in Admin Load Planner
   │
   ▼ [Admin assigns to container, docs verified]
INSPECTION_SCHEDULED ───────────────────────────────────────────────────────►
   │
   ▼ [NRCS/PPECB inspection passed]
INSPECTED ──────────────────────────────────────────────────────────────────►
   │ • All compliance docs uploaded & approved
   │
   ▼ [Cargo loaded onto vessel]
LOADED ─────────────────────────────────────────────────────────────────────►
   │ • TIVE tracker activated
   │ • HBL generated
   │
   ▼ [Vessel departs]
SAILING ────────────────────────────────────────────────────────────────────►
   │ • Real-time temperature tracking
   │ • Status: "AT_SEA"
   │
   ▼ [Vessel arrives at destination]
ARRIVED ────────────────────────────────────────────────────────────────────►
   │ • Generates 40% Balance Invoice (ISSUED)
   │ • Sends "Cargo Arrived" email with invoice
   │
   ▼ [Balance payment received]
BALANCE_PAID ───────────────────────────────────────────────────────────────►
   │
   ▼ [Cargo cleared customs & delivered]
DELIVERED ──────────────────────────────────────────────────────────────────►
   │ • Final delivery confirmation
   │ • Temperature log available for download
   │
   ▼ [All docs archived]
COMPLETED ──────────────────────────────────────────────────────────────────►
```

#### Server Actions
- [ ] **`submitBooking(formData)`:**
  - Validates: 21-day rule, Friday rule, pallet capacity (5-20)
  - Creates booking record with status SUBMITTED
  - Calculates pricing using current rate cards
  - Creates pricing snapshot
  - Generates deposit invoice
  - Returns booking reference
  
- [ ] **`uploadDocument(bookingId, file, type)`:**
  - Uploads to S3/UploadThing
  - Creates document record with PENDING status
  - Triggers admin review notification
  
- [ ] **`approveDocument(documentId, adminId)`:**
  - Updates document status to APPROVED
  - Checks if all required docs are now approved
  - Updates booking status if compliance complete

### Task 2.3: Financial Calculation Engine
*The pricing logic that powers invoices.*

#### Price Calculator Service (`lib/services/pricing.ts`)
```typescript
interface PricingInput {
  salesRateTypeId: string;  // SRS or SCS
  originId: string;
  destinationId: string;
  containerId: string;  // References container (size + type + variant)
  palletCount: number;
  effectiveDate: Date;
}

interface PricingOutput {
  originCharges: {
    items: ChargeItem[];
    totalZAR: number;
    perPalletZAR: number;
  };
  oceanFreight: {
    items: FreightItem[];
    totalUSD: number;
    exchangeRate: number;
    totalZAR: number;
    perPalletZAR: number;
  };
  destinationCharges: {
    items: ChargeItem[];
    totalLocal: number;
    localCurrency: string;
    exchangeRate: number;
    totalZAR: number;
    perPalletZAR: number;
  };
  subtotal: {
    totalZAR: number;
    perPalletZAR: number;
  };
  financeFee: {
    rate: string;  // "Prime + 2%"
    percentage: number;
    amountZAR: number;
  };
  total: {
    perPalletZAR: number;
    grandTotalZAR: number;
  };
  deposit: {
    percentage: number;  // 60
    amountZAR: number;
  };
  balance: {
    percentage: number;  // 40
    amountZAR: number;
  };
}
```

- [ ] **Implement `calculateBookingPrice(input: PricingInput): PricingOutput`**
  - Fetch current origin charges for route
  - Fetch current ocean freight rates
  - Fetch current destination charges
  - Apply exchange rates (USD→ZAR, GBP→ZAR, EUR→ZAR)
  - Calculate per-pallet and total costs
  - Add finance fee (Prime + 2%)
  - Split into 60/40 deposit/balance
  
- [ ] **Implement `getExchangeRate(from: string, to: string, date: Date): number`**
  - Check exchange_rates table for date
  - If not found, fetch from external API (mock for now)
  - Cache rate for date
  
- [ ] **Implement `getPrimeRate(date: Date): number`**
  - Fetch current prime lending rate from finance_settings

#### Invoice Generator Service (`lib/services/invoicing.ts`)

- [ ] **Implement `generateDepositInvoice(bookingId: string): Invoice`**
  - Fetch booking and pricing snapshot
  - Calculate 60% of grand total
  - Generate invoice number (INV-YYYY-NNNN)
  - Create invoice record with type DEPOSIT
  - Generate PDF using react-pdf/renderer
  - Upload PDF to storage
  - Update invoice with PDF URL
  - Send invoice email
  
- [ ] **Implement `generateBalanceInvoice(bookingId: string): Invoice`**
  - Triggered when booking status = ARRIVED
  - Calculate 40% of grand total
  - Same flow as deposit invoice with type BALANCE

#### Invoice PDF Template
*Based on Screenshot 4 - SRS Summary format*

```
┌─────────────────────────────────────────────────────────────────┐
│                     SEAIRO CARGO SOLUTIONS                       │
│                        TAX INVOICE                               │
│                                                                  │
│  Invoice No: INV-2024-0001          Date: 27 Jan 2024           │
│  Booking Ref: SCR-2024-0001         Due Date: 10 Feb 2024       │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  BILL TO:                           SHIP TO:                     │
│  Company Name                       Consignee Name               │
│  Address Line 1                     Delivery Address             │
│  Address Line 2                     City, Country                │
│  VAT: ZA123456789                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SRS - Sales Rates (Shared Reefer Services) Refrigerated        │
│  Route: Cape Town to London                                      │
│  Equipment: 40ft HC Reefer - 20 pallets                         │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  DESCRIPTION                                    ZAR              │
├─────────────────────────────────────────────────────────────────┤
│  Origin Landsides                          R    4,178.00         │
│  Ocean Freight                             R    4,452.00         │
│  Destination Charges                       R    2,400.00         │
│                                           ─────────────          │
│  Subtotal                                  R   11,030.00         │
│  Finance Fee (Prime + 2%)                  R      225.00         │
│                                           ─────────────          │
│  Total Cost per Pallet              1     R   11,255.00         │
│                                                                  │
│  Total Cost (5 pallets)             5     R   56,275.00         │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  THIS INVOICE: 60% DEPOSIT                                       │
│                                                                  │
│  Deposit Amount (60%)                      R   33,765.00         │
│  VAT (15%)                                 R    5,064.75         │
│                                           ─────────────          │
│  TOTAL DUE                                 R   38,829.75         │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  BANKING DETAILS                                                 │
│  Bank: First National Bank                                       │
│  Account: Seairo Cargo Solutions                                 │
│  Account No: 62XXXXXXXX                                          │
│  Branch Code: 250655                                             │
│  Reference: SCR-2024-0001                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛡️ PHASE 3: THE ADMIN "GOD MODE" (Operational Portal)
*Goal: A completely separate interface for Seairo/Savino staff to manage the chaos.*

### Task 3.1: Admin Shell & Auth
- [ ] **Separate Route:** `/admin/*` protected by `role === 'ADMIN'`
- [ ] **Admin Sidebar:**
  - **Dashboard:** KPIs, Revenue, Active Shipments
  - **Mission Control:** Global Map of all cargo
  - **Rate Management:** (NEW) Configure all pricing
  - **Vetting Queue:** New Signups
  - **Load Planning:** Container Optimization
  - **Shipments:** All bookings across all users
  - **Documents:** Compliance review queue
  - **Finance:** Invoices, Payments, Revenue
  - **Settings:** Exchange rates, Finance settings

### Task 3.2: Rate Management Module (NEW)
*Admin interface for managing the complete pricing structure.*

#### 3.2.1 Sales Rate Types Manager
- [ ] **List View:** Grid of rate types (SRS, SCS) with active/inactive toggle
- [ ] **Create/Edit:** Modal for adding new rate type codes
- [ ] **Usage Stats:** Show which bookings use each rate type

#### 3.2.2 Origin Charges Manager (SA Landsides)
- [ ] **List View:** Grid showing all origin charge configurations
  - Filter by: Origin location, Container type, Date range, Active status
- [ ] **Create New Rate Card:**
  - Select origin (Cape Town, Durban)
  - Select container type (40ft HC)
  - Set effective date range
  - Add charge items (drag & drop reorder)
- [ ] **Charge Item Editor:**
  - Category selector (Collection, Storage, Transport, etc.)
  - Charge name & code
  - Charge type: Per Pallet / Per Container / Fixed
  - Unit cost (per pallet) / Container cost
  - Mandatory toggle
- [ ] **Bulk Import:** CSV import for rate cards
- [ ] **Version History:** Track changes to rate cards
- [ ] **Clone Function:** Copy existing rate card for new period

#### 3.2.3 Ocean Freight Manager
- [ ] **List View:** Grid showing all ocean freight rates
  - Filter by: Origin, Destination, Shipping Line, Date range
- [ ] **Create New Route Rate:**
  - Select origin (Cape Town/Durban)
  - Select destination from dropdown
  - Select shipping line (MSC, etc.)
  - Enter rates in USD:
    - Base Freight
    - BAF (Bunker Adjustment Factor)
    - ISPS (Security)
    - RCG (Reefer Cargo Guarantee)
    - Other Surcharges
  - System calculates Total USD
  - Link exchange rate for ZAR conversion
- [ ] **Rate Comparison:** Side-by-side view of routes
- [ ] **Bulk Update:** Update multiple routes (e.g., BAF change)

#### 3.2.4 Destination Charges Manager (DAP)
- [ ] **List View:** Grid showing all destination charge configurations
  - Filter by: Destination, Container type, Date range
- [ ] **Create New DAP Card:**
  - Select destination (London Gateway, Dublin, etc.)
  - Select container type
  - Set currency (GBP, EUR)
  - Set effective date range
  - Add charge items
- [ ] **Charge Item Editor:**
  - Charge code & name
  - Amount in local currency
  - Auto-convert to ZAR using linked exchange rate
- [ ] **Multi-currency Support:** Handle GBP, EUR, USD

#### 3.2.5 Exchange Rate Manager
- [ ] **Current Rates Dashboard:**
  - USD/ZAR, GBP/ZAR, EUR/ZAR with last update time
  - Manual override capability
  - Source indicator (SARB, Manual, API)
- [ ] **Historical Chart:** Rate trends over time
- [ ] **Auto-Fetch Toggle:** Enable/disable daily API fetch
- [ ] **Alert Settings:** Notify on significant rate changes

#### 3.2.6 Finance Settings Manager
- [ ] **Global Settings:**
  - Prime lending rate (currently ~11.75%)
  - Finance margin (currently 2%)
  - Deposit percentage (60%)
  - Balance percentage (40%)
  - VAT rate (15%)
  - Default currency (ZAR)
- [ ] **Audit Log:** Track who changed what and when

### Task 3.3: The Vetting System
- [ ] **UI:** Split screen. Left: User Application (Docs). Right: Action Panel (Approve/Reject)
- [ ] **Action:** "Approve" triggers system to:
  - Generate unique Account Number (e.g., `ACC-2024-001`)
  - Assign default rate type (SRS)
  - Assign credit terms (if applicable)
  - Send "Welcome & Rate Card" email
  - Enable "New Booking" access in User Dashboard
- [ ] **Rejection Flow:** Reason selector, notification to applicant

### Task 3.4: The "Load Planner" (Tetris for Admins)
- [ ] **Visual Interface:**
  - Select a Sailing (e.g., MSC Orchestra)
  - View a 40ft Container Grid (20 slots)
  - **Drag & Drop:** Drag booked pallets from "Pending List" into Container Slots
  - **Validation:** Prevent over-booking (Max 20 pallets)
  - **Optimization:** Auto-suggest optimal packing
- [ ] **Manifest Generation:**
  - One-click "Download Manifest" PDF
  - Export to Excel for warehouse
  - TIVE device assignment

### Task 3.5: Document Compliance Hub
- [ ] **Traffic Light System:**
  - List all active shipments
  - **Red:** Missing required docs (HBL, CoA, NRCS, PPECB)
  - **Amber:** Docs pending review
  - **Green:** All docs present and approved
- [ ] **Bulk Actions:**
  - Approve multiple docs
  - Request re-upload
  - Download all docs as ZIP
- [ ] **MBL Upload:** Admin uploads Master Bill of Lading which auto-links to all House Bills

### Task 3.6: Admin Finance Dashboard
- [ ] **KPI Cards:**
  - Total Revenue (MTD, YTD)
  - Outstanding Invoices
  - Overdue Amount
  - Average Payment Days
- [ ] **Invoice Management:**
  - Filter by status (Issued, Paid, Overdue)
  - Filter by type (Deposit, Balance)
  - Search by booking ref or customer
  - Bulk reminders
- [ ] **Payment Recording:**
  - Manual payment entry
  - Bank reconciliation view
  - Partial payment handling
- [ ] **Reporting:**
  - Revenue by route
  - Revenue by customer
  - Revenue by period
  - Export to CSV/Excel

---

## 🔗 PHASE 4: WORLD CLASS INTEGRATIONS
*Goal: Automate the manual work.*

### Task 4.1: Metaship Two-Way Sync
- [ ] **Pull:** Cron job (Vercel Cron) runs every 24h to fetch Sailing Schedules from Metaship API
- [ ] **Push:** When Admin clicks "Finalize Load Plan", POST the manifest to Metaship

### Task 4.2: TIVE IoT + QR Code System (Smart Pallets)
- [ ] **QR Association:** Logic to link a `Pallet ID` (QR) -> `TIVE Device ID`
- [ ] **Webhook Endpoint:** `POST /api/webhooks/tive`
- [ ] **Logic:** Receive temp payload. If `temp > -18.0`, trigger `sendAlertEmail()` (Insurance Requirement)
- [ ] **Frontend:** Render a Recharts Line Graph on the User's Shipment Detail page

### Task 4.3: Meatship.ai Integration (The Brain)
*Goal: Sync Bookings and Documents with the core ops system.*
- [ ] **Booking Push:** When User clicks "Submit", POST booking payload to Meatship
- [ ] **Shipment Pull:** Webhook listener for "Shipment Created" events (returning the Master Ref)
- [ ] **Doc Sync:** Two-way sync of CoAs, HBLs, and Invoices

### Task 4.4: Exchange Rate API Integration
- [ ] **Primary:** SARB (South African Reserve Bank) rates API
- [ ] **Fallback:** Open Exchange Rates / Fixer.io
- [ ] **Schedule:** Daily fetch at 08:00 SAST
- [ ] **Alerting:** Notify admin on significant rate movements (>2%)

### Task 4.5: Email Service Integration (Resend)
- [ ] **Templates:**
  - Booking Submitted Confirmation
  - Deposit Invoice Issued
  - Deposit Payment Confirmed
  - Inspection Scheduled
  - Cargo Loaded / Sailing
  - Cargo Arrived + Balance Invoice
  - Payment Reminder (Automated)
  - Payment Overdue Warning
  - Delivery Confirmation
- [ ] **Attachments:** PDF invoices, temperature logs

---

## 💰 PHASE 5: FINANCIAL AUTOMATION & NOTIFICATIONS
*Goal: Get paid faster.*

### Task 5.1: The "Payment Chaser" Bot
- [ ] **Logic:** Cron job checks for `status === ARRIVED` and `paymentStatus !== FULL`
- [ ] **Schedule:** Daily at 09:00 SAST
- [ ] **Action:** Sends automated "Cargo Arrived - Please Settle Balance" emails via Resend
- [ ] **Escalation:**
  - Day 0: Invoice issued
  - Day 7: Friendly reminder
  - Day 14: Second reminder + admin notification
  - Day 30: Overdue warning + hold future bookings

### Task 5.2: In-App Notification Center
- [ ] **UI:** Bell Icon in the top bar with unread count badge
- [ ] **Real-time:** Use Supabase Realtime or Polling
- [ ] **Notification Types:**
  - New Document Uploaded
  - Inspection Passed/Failed
  - Invoice Issued
  - Payment Received
  - Shipment Status Change
  - Temperature Alert
- [ ] **Preferences:** User can toggle which notifications to receive

### Task 5.3: Client Pricing Preview (NEW)
*Show estimated pricing to clients during booking.*
- [ ] **Step 3 Enhancement:** After route selection, show pricing breakdown
- [ ] **Display Format:**
  ```
  ┌─────────────────────────────────────────────┐
  │  ESTIMATED COST (5 Pallets)                 │
  │                                             │
  │  Origin Charges:         R    4,178.00      │
  │  Ocean Freight:          R    4,452.00      │
  │  Destination Charges:    R    2,400.00      │
  │  Finance Fee:            R      225.00      │
  │  ─────────────────────────────────────      │
  │  Per Pallet:             R   11,255.00      │
  │  Total:                  R   56,275.00      │
  │                                             │
  │  DEPOSIT (60%):          R   33,765.00      │
  │  BALANCE (40%):          R   22,510.00      │
  └─────────────────────────────────────────────┘
  ```
- [ ] **Disclaimer:** "Prices are estimates and may vary based on actual sailing date and exchange rates."

### Task 5.4: Client Invoice Portal (NEW)
- [ ] **My Invoices View:**
  - List all invoices with status badges
  - Filter by status, date range
  - Download PDF
  - View payment history
- [ ] **Invoice Detail Page:**
  - Full breakdown of charges
  - Payment instructions
  - Linked booking details
  - Upload proof of payment
- [ ] **Statement Download:**
  - Monthly account statement
  - Outstanding balance summary

---

## 📊 PHASE 6: ANALYTICS & REPORTING (NEW)
*Goal: Data-driven decisions for both clients and admins.*

### Task 6.1: Client Analytics Dashboard
- [ ] **Shipment History:** Charts showing shipments over time
- [ ] **Spend Analysis:** Cost breakdown by route, commodity
- [ ] **Average Transit Times:** By route
- [ ] **Document Compliance Score:** On-time doc submission rate

### Task 6.2: Admin Business Intelligence
- [ ] **Revenue Dashboard:**
  - Revenue by period (daily, weekly, monthly, yearly)
  - Revenue by route
  - Revenue by client
  - Revenue by commodity type
- [ ] **Capacity Utilization:**
  - Pallet slots filled vs available
  - Revenue per pallet trend
- [ ] **Client Health:**
  - Payment performance (DSO)
  - Booking frequency
  - Churn risk indicators
- [ ] **Operational Metrics:**
  - Average booking to sailing time
  - Document compliance rate
  - Temperature excursion incidents

### Task 6.3: Automated Reports
- [ ] **Weekly Operations Summary:** Auto-generated for ops team
- [ ] **Monthly Revenue Report:** For finance team
- [ ] **Client Account Statements:** Auto-generated monthly

---

## 🧪 PHASE 7: TESTING & QUALITY ASSURANCE (NEW)
*Goal: Production-ready, battle-tested system.*

### Task 7.1: Unit Testing
- [ ] **Pricing Calculator:** Test all scenarios (edge cases, rounding)
- [ ] **State Machine:** Test all valid/invalid transitions
- [ ] **Date Validation:** Friday rule, 21-day rule edge cases
- [ ] **Invoice Generation:** Test all invoice types

### Task 7.2: Integration Testing
- [ ] **Booking Flow:** End-to-end booking submission
- [ ] **Payment Flow:** Invoice generation → payment → status update
- [ ] **Document Flow:** Upload → review → approve/reject
- [ ] **Exchange Rate:** Rate fetch → pricing update

### Task 7.3: E2E Testing (Playwright)
- [ ] **Client Journeys:**
  - Sign up → Vetting → First booking
  - Create booking → Pay deposit → Track shipment
  - View invoices → Download statement
- [ ] **Admin Journeys:**
  - Vet new user → Approve
  - Manage rates → Update freight
  - Review docs → Approve booking

### Task 7.4: Performance Testing
- [ ] **Load Testing:** 100 concurrent bookings
- [ ] **Database Optimization:** Index optimization for common queries
- [ ] **PDF Generation:** Stress test invoice generation

---

## 📱 PHASE 8: MOBILE OPTIMIZATION (NEW)
*Goal: Full functionality on mobile devices.*

### Task 8.1: Responsive Design Audit
- [ ] **Dashboard:** Ensure all widgets work on mobile
- [ ] **Booking Wizard:** Touch-friendly 3D controls
- [ ] **Kanban Board:** Swipe gestures for mobile
- [ ] **Document Upload:** Camera integration for mobile

### Task 8.2: PWA Features
- [ ] **Install Prompt:** Add to home screen
- [ ] **Offline Mode:** View recent shipments offline
- [ ] **Push Notifications:** Native-style notifications

---

## 🚀 DEPLOYMENT CHECKLIST

### Pre-Launch
- [ ] All seed data loaded (Locations, Commodities, Rate Cards)
- [ ] Exchange rates populated
- [ ] Admin users created
- [ ] Email templates configured
- [ ] PDF templates finalized
- [ ] Error tracking (Sentry) configured
- [ ] Analytics (PostHog/Mixpanel) configured

### Launch
- [ ] Database backups automated
- [ ] Monitoring dashboards set up
- [ ] On-call rotation established
- [ ] Runbook documented

### Post-Launch
- [ ] User feedback collection
- [ ] Performance monitoring
- [ ] Regular rate card updates scheduled
- [ ] Quarterly feature review

---

## 📝 APPENDIX: DATA REFERENCE

### Origin Charge Items (SA Landsides - Full List)
| Code | Name | Type | Category |
|------|------|------|----------|
| COLLECTION | Collection in/around Cape Town | PER_CONTAINER | COLLECTION |
| COLD_STORAGE | Cold storage per week and part thereof | PER_PALLET | STORAGE |
| HANDLING | Handling in and out | PER_PALLET | HANDLING |
| TRANSPORT_TBP | Transport - Table Bay to port | PER_PALLET | TRANSPORT |
| FUEL_SURCHARGE | Fuel Surcharge | FIXED | TRANSPORT |
| GENSET | Genset | PER_PALLET | TRANSPORT |
| VGM | VGM | PER_PALLET | TRANSPORT |
| TERMINAL | Terminal Handling | PER_CONTAINER | REGULATORY |
| CARRIER_SVC | Carrier Service fee | PER_PALLET | REGULATORY |
| CARGO_DUES | Cargo Dues | PER_CONTAINER | REGULATORY |
| BOL_FEE | Bill of Lading Fee | PER_CONTAINER | DOCUMENTATION |
| SEAL_FEE | Seal fee | PER_CONTAINER | REGULATORY |
| NAVIS_FEE | Navis Fee | PER_CONTAINER | REGULATORY |
| COURIER | Courier Fee | PER_CONTAINER | DOCUMENTATION |
| TRACKING | Tracking and reporting | PER_CONTAINER | DOCUMENTATION |
| DATA_LOGGER | Data Logger | PER_CONTAINER | DOCUMENTATION |
| PORT_HEALTH | Port Health Inspections | PER_CONTAINER | REGULATORY |
| PPECB | PPECB | PER_CONTAINER | REGULATORY |
| EUR1 | EUR 1 | PER_CONTAINER | DOCUMENTATION |
| NRCS | NRCS | PER_CONTAINER | REGULATORY |
| EDI_FEE | EDI Fee | PER_CONTAINER | DOCUMENTATION |
| CUSTOMS | Customs Clearance | PER_CONTAINER | CUSTOMS |
| INSURANCE | Insurance | PER_CONTAINER | INSURANCE |
| AGENCY_FEE | Agency Fee | PER_CONTAINER | OTHER |
| FACILITY_FEE | Facility Fee - on 30 days | PER_CONTAINER | OTHER |

### Destination Charge Items (DAP - London Gateway Example)
| Code | Name | Amount (GBP) |
|------|------|--------------|
| DELIVERY_COLD | Delivery to cold store Kent | 560.00 |
| GENSET | Genset | 280.00 |
| DOCUMENTATION | Documentation | 55.00 |
| PORT_CHARGES | Port Charges | 110.00 |
| THC | Terminal Handling Charge | 285.00 |
| CUSTOMS_ENTRY | Customs Entry | 400.00 |
| CARRIER_TERMINAL | Carrier Terminal Fees | 100.00 |
| UNPACK | Unpack | 385.00 |

### Invoice Calculation Example
**Route:** Cape Town → London Gateway  
**Container:** 40ft HC Reefer  
**Pallets:** 5

| Component | Per Pallet (ZAR) | Total (ZAR) |
|-----------|------------------|-------------|
| Origin Landsides | 835.60 | 4,178.00 |
| Ocean Freight | 890.40 | 4,452.00 |
| Destination Charges | 480.00 | 2,400.00 |
| **Subtotal** | 2,206.00 | 11,030.00 |
| Finance Fee (Prime + 2%) | 45.00 | 225.00 |
| **Total** | **2,251.00** | **11,255.00** |
| **Deposit (60%)** | | **6,753.00** |
| **Balance (40%)** | | **4,502.00** |

---

*Last Updated: January 2026*  
*Version: 7.0*  
*Author: SRS Development Team*