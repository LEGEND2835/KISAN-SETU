# KisanSetu MVP Workflow & System Architecture

> **Document Version:** 1.0 (Current Working MVP)  
> **Repository:** KisanSetu — Agricultural Procurement Slot Booking & Realtime Queue Tracking System  
> **Scope:** Strictly describes the existing, verified codebase as currently implemented.

---

## Table of Contents
1. [Overall System Architecture](#1-overall-system-architecture)
2. [Farmer Workflow (Step-by-Step)](#2-farmer-workflow-step-by-step)
3. [Mandi Officer & Staff Workflow](#3-mandi-officer--staff-workflow)
4. [Data Flow & Communication Lifecycle](#4-data-flow--communication-lifecycle)
5. [Authentication, Security & User Roles](#5-authentication-security--user-roles)
6. [PostgreSQL Database Schema & Tables](#6-postgresql-database-schema--tables)
7. [Backend API Modules & Routes](#7-backend-api-modules--routes)
8. [Realtime Synchronization Layer (Socket.IO)](#8-realtime-synchronization-layer-socketio)
9. [ASCII & Markdown Architecture Diagrams](#9-ascii--markdown-architecture-diagrams)
10. [Viva Explanation & Technical Defense Guide](#10-viva-explanation--technical-defense-guide)

---

## 1. Overall System Architecture

KisanSetu is built as a three-tier, real-time client-server web application backed by a relational PostgreSQL database and bidirectional WebSocket communication.

```
+-------------------------------------------------------------------------+
|                           CLIENT TIER (React SPA)                       |
|   React 18 + Vite | Tailwind CSS | Lucide Icons | Socket.IO Client      |
+-------------------------------------------------------------------------+
                                    |
                  REST (HTTP/JSON)  |  WebSockets (Socket.IO)
                  [JWT Bearer Auth] |  [Realtime Queue Events]
                                    v
+-------------------------------------------------------------------------+
|                         APPLICATION SERVER (Node.js)                    |
|   Express 4 REST APIs  |  Socket.IO Server  |  JWT Auth Middleware      |
+-------------------------------------------------------------------------+
                                    |
                     SQL Queries / Transactions
                     (pg Pool / node-postgres)
                                    v
+-------------------------------------------------------------------------+
|                         DATABASE TIER (PostgreSQL)                      |
|   8 Relational Tables | ACID Transactions | B-Tree Indexes | Cascades   |
+-------------------------------------------------------------------------+
```

### Component Breakdown:
1. **Frontend Client (`/client`)**:
   - **Framework:** React 18 with Vite for fast build and rendering.
   - **Styling:** Tailwind CSS with responsive layout and dark-mode glassmorphism theme.
   - **Routing:** React Router v6 with public and authenticated farmer/officer views.
   - **State Management:** React Context API (`AuthContext` for auth session, `LanguageContext` for multilingual English/Hindi translations).
   - **Networking:** Axios client with automatic JWT bearer token interceptors, and `socket.io-client` for live queue listeners.
   - **Pass/QR Rendering:** `qrcode.react` for rendering verification QR tokens.

2. **Backend Server (`/server`)**:
   - **Runtime:** Node.js (ES Modules).
   - **Web Framework:** Express.js for REST API endpoints.
   - **Authentication:** `jsonwebtoken` (JWT) with HMAC SHA-256 signing and `bcryptjs` for salted password hashing.
   - **Realtime Engine:** Socket.IO server (`queueSocket.js`) handling room-based broadcasting (`centre:${centreId}`).
   - **Database Client:** Native `pg` (node-postgres) connection pooling with auto-reconnection and parameter binding to eliminate SQL injection.

3. **Database (`PostgreSQL`)**:
   - Relational database storing users, centres, slots, bookings, quality checks, weighbridge weights, payments, and audit logs.
   - Enforces referential integrity with foreign key constraints, unique constraints, and ACID transactions for token booking.

---

## 2. Farmer Workflow (Step-by-Step)

The farmer journey transitions seamlessly from slot discovery to electronic receipt generation:

```
[1. Registration / Login]
         │
         ▼
[2. Crop & Estimated Quantity Entry]
         │
         ▼
[3. Vehicle Selection (Capacity Validation)]
         │
         ▼
[4. Mandi Centre Selection (ETA & Congestion View)]
         │
         ▼
[5. Time Slot Window Selection (e.g., 08:00 - 10:00)]
         │
         ▼
[6. Booking Confirmation & PostgreSQL Transaction]
         │
         ▼
[7. Digital Gate Pass Generation (Token & QR Code)]
         │
         ▼
[8. Physical Arrival & Gate Check-in]
         │
         ▼
[9. Live Queue Station Tracking (Gate -> Lab -> Weighbridge)]
         │
         ▼
[10. Quality Inspection (Moisture & Grade)]
         │
         ▼
[11. Gross & Tare Weighbridge Weight Logging]
         │
         ▼
[12. e-J-Form Generation & DBT Payment Clearance]
```

### Detailed Farmer Steps:
1. **Registration / Login:**
   - Farmer registers with mobile number, full name, state, district, village, and password.
   - Existing farmers sign in; the backend validates against PostgreSQL and issues a signed JWT token.
2. **Crop & Quantity Selection (`/book-slot` Step 1):**
   - Farmer selects commodity (e.g., Wheat, Paddy, Mustard, Gram) and enters estimated quintals.
3. **Vehicle Capacity Limit Enforcement:**
   - The UI and backend validate vehicle capacity:
     - **Bullock Cart:** Max 30 Quintals
     - **Mini Truck (Tata Ace/407):** Max 70 Quintals
     - **Tractor Trolley:** Max 100 Quintals
     - **Heavy Truck:** Max 300 Quintals
   - If a farmer enters 60 Qtl, Bullock Cart is disabled, and the system auto-selects a suitable vehicle (Tractor Trolley / Mini Truck).
4. **Mandi Centre Selection (`/book-slot` Step 2):**
   - Farmer views list of active Mandis with current queue load, distance, and daily capacity.
5. **Time Slot Selection (`/book-slot` Step 3):**
   - Farmer chooses an available 2-hour window (e.g., 08:00–10:00, 10:00–12:00).
6. **Booking & Token Generation:**
   - An ACID database transaction reserves slot capacity, increments token counts, and generates a unique token (e.g., `TK-KRL-482`) and QR hash.
7. **Digital Pass & Realtime Tracking (`/token/:id` or `/my-bookings`):**
   - Farmer views the digital gate pass with countdown, live queue station, and gate status.

---

## 3. Mandi Officer & Staff Workflow

Mandi staff have an operator dashboard to manage daily throughput across all yard stations:

```
[1. Officer Login]
         │
         ▼
[2. Mandi Officer Dashboard (/centre/officer)]
         │
         ▼
[3. Review Scheduled Bookings (stages.booked)]
         │
         ▼
[4. Gate Admit / Check-in (Moves token to stages.waiting_at_gate)]
         │
         ▼
[5. Station Call (Call farmer to Quality Lab)]
         │
         ▼
[6. Quality Testing (Record Moisture %, Foreign Matter %, Grade A/B/FAQ)]
         │
         ▼
[7. Weighbridge (Record Gross Weight Loaded -> Tare Weight Empty)]
         │
         ▼
[8. Automated J-Form Procurement Receipt (Net Weight x MSP Rate)]
         │
         ▼
[9. Realtime Broadcast to Public Display & Farmer Pass]
```

### Key Officer Dashboard Operations:
- **Kanban Board & Station Tabs:**
  - **Scheduled Slots (`stages.booked`):** Displays incoming farmer bookings with 1-click **"Admit to Gate"** action.
  - **Gate & Waiting Yard (`stages.waiting_at_gate` & `stages.called`):** Vehicles currently in the Mandi waiting yard ready for lab testing.
  - **Quality Testing Lab (`stages.quality_inspection`):** Inspectors enter moisture percentage, foreign matter, and grade (`GRADE_A`, `GRADE_B`, `FAQ`, `REJECTED`).
  - **Weighbridge (`stages.weighing` & `stages.unloading`):** Operators log gross weight (loaded vehicle) and tare weight (empty vehicle after unloading).
  - **Procured / Completed (`stages.completed`):** Generates official e-J-Form with calculated net quintals and total DBT disbursement amount.
- **Station Call Action:**
  - Officer clicks "Call Next" for a specific desk/bay. Emits a realtime audio/visual signal to the yard display and farmer screen.

---

## 4. Data Flow & Communication Lifecycle

```
[React Client]
      │
      │ 1. POST /api/slots/book { slot_id, qty, vehicle }
      ▼
[Express Server (slots.js)]
      │
      │ 2. BEGIN TRANSACTION
      │    - INSERT INTO bookings (...)
      │    - UPDATE slots SET booked_tokens = booked_tokens + 1 ...
      │    - INSERT INTO queue_audit_logs (...)
      │    COMMIT
      ▼
[PostgreSQL Database]
      │
      │ 3. Returns New Booking Row
      ▼
[Express Server]
      │
      │ 4. HTTP 201 Response to Farmer Client
      │ 5. broadcastQueueUpdate(centre_id) via Socket.IO
      ▼
[Socket.IO Server] ───► Emits "queue_updated" to Room "centre:ctr_karnal_01"
      │
      ├───────────────────────────────┬───────────────────────────────┐
      ▼                               ▼                               ▼
[Mandi Officer Dashboard]    [Public Yard TV Display]       [Farmer Live Pass]
(Adds token to Kanban board) (Updates live token numbers)    (Updates status badge)
```

### Communication Protocols:
- **Client-to-Server Requests:** Standard REST over HTTP/HTTPS with JSON payloads.
- **Authorization:** `Authorization: Bearer <jwt_token>` header verified by backend middleware.
- **Server-to-Client Updates:** WebSockets via Socket.IO for sub-second push notifications without polling.

---

## 5. Authentication, Security & User Roles

Authentication is implemented in `server/src/routes/auth.js` and protected by `server/src/middleware/auth.js`.

### Implemented User Roles:
| Role Identifier | UI Display Name | Primary Access & Permissions |
|---|---|---|
| `farmer` | Farmer / Annadata | Book slots, view gate pass, cancel booking, track pass status, download J-Form. |
| `centre_officer` | Mandi Supervisor | View all queue stages, admit vehicles at gate, call tokens, supervise yard. |
| `quality_inspector`| Quality Inspector | Record grain moisture, foreign matter, determine grade and deductions. |
| `weighbridge_operator`| Weighbridge Operator | Record gross loaded weight and tare empty weight. |

### Security Measures:
- **Password Hashing:** `bcryptjs` with salt factor 10. Raw passwords are never stored.
- **Stateless Tokens:** JWT signed with server secret (`JWT_SECRET`) containing `userId`, `phone`, and `role`.
- **Database Role Enforcement:** User role is always extracted from the database row upon login rather than trusted from client input.
- **Strict Role Routing:** Farmers route to `/my-bookings` while Mandi officers route to `/centre/officer`.

---

## 6. PostgreSQL Database Schema & Tables

The schema is defined in `server/src/db/schema.sql` and initialized automatically on startup via `server/src/db/index.js`.

```
                        +--------------------+
                        |       users        |
                        +--------------------+
                        | id (PK)            |
                        | phone (UNIQUE)     |
                        | role               |
                        +---------+----------+
                                  | 1
                                  |
                                  | N
+--------------------+  1       N +---------+----------+ N       1 +--------------------+
|      centres       +------------+      bookings      +-----------+       slots        |
+--------------------+            +---------+----------+           +--------------------+
| id (PK)            |            | id (PK)            |           | id (PK)            |
| code (UNIQUE)      |            | token_number (UQ)  |           | centre_id (FK)     |
| daily_capacity     |            | status             |           | slot_date, times   |
+--------------------+            +----+----+----+-----+           +--------------------+
                                       |    |    |
                   ┌───────────────────┘    |    └───────────────────┐
                   │ 1                      │ 1                      │ 1
                   ▼ 1                      ▼ 1                      ▼ 1
        +----------+---------+   +----------+---------+   +----------+---------+
        |   quality_checks   |   |  weighbridge_logs  |   |      payments      |
        +--------------------+   +--------------------+   +--------------------+
        | booking_id (FK, UQ)|   | booking_id (FK, UQ)|   | booking_id (FK, UQ)|
        | moisture_pct       |   | gross_weight_kg    |   | receipt_number (UQ)|
        | grain_grade        |   | tare_weight_kg     |   | net_payable_amount |
        +--------------------+   | net_weight_quintals|   | payment_status     |
                                 +--------------------+   +--------------------+
```

### Table Descriptions:
1. **`users`**: Stores farmer and staff credentials, phone numbers, locations, Aadhaar last-4, and bank IFSC details.
2. **`centres`**: Stores procurement hubs/Mandis, geographic coordinates, daily quintal capacity, and supported crops.
3. **`slots`**: Stores 2-hour capacity buckets per Mandi per date with `max_capacity_quintals`, `booked_capacity_quintals`, `max_tokens`, and `booked_tokens`.
4. **`bookings`**: Central operational table storing tokens, farmer reference, vehicle details, crop info, QR code hash, and lifecycle status (`BOOKED`, `CHECKED_IN`, `CALLED`, `QUALITY_INSPECTION`, `WEIGHING`, `UNLOADING`, `PROCURED`, `CANCELLED`).
5. **`quality_checks`**: Stores lab analysis results (moisture percentage, foreign matter, damaged grains, grade).
6. **`weighbridge_logs`**: Stores scale weighbridge readings (gross weight, tare weight, calculated net weight in quintals).
7. **`payments`**: Stores official e-J-Form receipts, applied MSP rates, net payable amount, DBT status (`PENDING`, `APPROVED`, `TRANSFERRED`), and bank transaction references.
8. **`queue_audit_logs`**: Immutable audit trail tracking every single status change, station transfer, and timestamp for complete transparency.

---

## 7. Backend API Modules & Routes

All routes are modularized under `server/src/routes/`:

| Route Module | Base URL | Key Endpoints | Purpose |
|---|---|---|---|
| `auth.js` | `/api/auth` | `POST /register-farmer`<br>`POST /login`<br>`GET /me` | User registration with roles, password verification, JWT issuance, and profile retrieval. |
| `centres.js` | `/api/centres` | `GET /`<br>`GET /:id` | Lists all Mandi hubs with live queue summary and capacity status. |
| `slots.js` | `/api/slots`<br>`/api/bookings` | `GET /`<br>`POST /book`<br>`GET /my`<br>`GET /:id`<br>`POST /:id/cancel` | Capacity-checked slot booking, vehicle limits, farmer pass lookup, and cancellation. |
| `queue.js` | `/api/queue` | `GET /:centreId/live`<br>`POST /:centreId/check-in`<br>`POST /:centreId/call-next`<br>`POST /:centreId/update-status` | Realtime queue state retrieval, gate admission, bay calling, and station movement. |
| `procurement.js` | `/api/procurement` | `POST /quality-check`<br>`POST /weighbridge`<br>`GET /receipt/:bookingId`<br>`GET /analytics` | Lab testing entry, weight logging, e-J-Form certificate generation, and executive analytics. |
| `ai.js` | `/api/ai` | `POST /recommend-slot`<br>`GET /predict-wait-time/:id`<br>`POST /chat-assistant` | Slot allocation recommendation, ETA estimation, and rule-based multilingual farmer assistant. |

---

## 8. Realtime Synchronization Layer (Socket.IO)

Realtime communication is managed by `server/src/sockets/queueSocket.js` and consumed by `client/src/services/socket.js`.

### Room Architecture:
Clients join specific rooms based on Mandi centre ID (`socket.emit('join_centre', centreId)`). This isolates events so updates in Karnal Mandi do not trigger re-renders for Ambala Mandi.

```
                  +-------------------------+
                  |    Socket.IO Server     |
                  +------------+------------+
                               |
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
   Room: "centre:ctr_karnal_01"          Room: "centre:ctr_ambala_02"
   ├── Officer Dashboard (Karnal)        ├── Officer Dashboard (Ambala)
   ├── Yard TV Display (Karnal)          ├── Yard TV Display (Ambala)
   └── Farmer Pass (Karnal Slot)         └── Farmer Pass (Ambala Slot)
```

### Event Lifecycle:
1. **`queue_updated`**:
   - **Emitted When:** A slot is booked, cancelled, admitted at gate, moved to lab, weighed, or completed.
   - **Payload:** `{ centre_id, timestamp }`
   - **Action:** Triggers automatic re-fetch of `GET /api/queue/:centreId/live` across all open screens.
2. **`token_called`**:
   - **Emitted When:** Mandi Officer clicks "Call Next" for a specific token.
   - **Payload:** `{ token_number, station_name, farmer_name, vehicle_number }`
   - **Action:** Yard TV displays flashing alert; farmer pass shows calling station.

---

## 9. ASCII & Markdown Architecture Diagrams

### 1. Queue State Machine Lifecycle
```
                 +-----------------+
                 |  ONLINE BOOKED  | (En-route from farm)
                 +--------+--------+
                          |
                   [Gate Arrival] -> Officer admits token
                          v
                 +-----------------+
                 |   CHECKED IN    | (Waiting in Mandi yard)
                 +--------+--------+
                          |
                   [Officer Call] -> Assigned to Bay/Desk
                          v
                 +-----------------+
                 |     CALLED      | (Proceed to testing)
                 +--------+--------+
                          |
                   [Lab Entry]
                          v
                 +-----------------+
                 | QUALITY TESTING | (Moisture & Grade check)
                 +--------+--------+
                          |
                   [Lab Passed]
                          v
                 +-----------------+
                 |    WEIGHING     | (Gross weight logged)
                 +--------+--------+
                          |
                   [Unloading Bay]
                          v
                 +-----------------+
                 |    UNLOADING    | (Tare weight logged)
                 +--------+--------+
                          |
                   [Auto J-Form]
                          v
                 +-----------------+
                 |    PROCURED     | (DBT payment record created)
                 +-----------------+
```

---

## 10. Viva Explanation & Technical Defense Guide

### 2-Minute Verbal Project Summary:
> "KisanSetu is an automated, real-time agricultural procurement and slot-booking platform engineered to eliminate 12-to-24-hour physical traffic jams and queue congestion at Indian Mandi procurement centres.
> 
> The system operates on a full-stack architecture: React on the frontend, Node.js and Express for the REST API layer, PostgreSQL for relational data persistence, and Socket.IO for real-time WebSocket state distribution.
> 
> When a farmer books a slot, the system enforces vehicle capacity constraints—preventing impossible loads like 60 quintals on a bullock cart—and executes an ACID transaction in PostgreSQL to reserve capacity and issue a tamper-evident digital token and QR code.
> 
> As the farmer arrives at the Mandi, the Officer Dashboard tracks the vehicle across live stations: Gate Check-in, Quality Testing for grain moisture, Gross and Tare Weighbridge logging, and finally generates an official electronic J-Form certificate with direct DBT payment calculations.
> 
> Every stage transition triggers room-based Socket.IO broadcasts that instantly update the Mandi Officer's Kanban board, the farmer's live pass, and the public gate TV display without requiring a page refresh."

---

### Top Technical Viva Questions & Direct Answers:

#### Q1: Why did you choose PostgreSQL over MongoDB for KisanSetu?
**Answer:** Agricultural procurement requires strict relational integrity and ACID transactions. Reserving slot capacity and generating unique tokens cannot tolerate race conditions or double-bookings. PostgreSQL allows transactional updates (`BEGIN ... COMMIT`) locking slot capacities and creating audit logs simultaneously.

#### Q2: How does the system prevent double-booking or over-booking a time slot?
**Answer:** Each time slot row in PostgreSQL tracks `max_tokens`, `booked_tokens`, `max_capacity_quintals`, and `booked_capacity_quintals`. When `POST /api/slots/book` executes, it verifies capacity within a database transaction. If the slot is full, the request is rejected with `400 Bad Request`. Unique constraints on `(centre_id, slot_date, start_time, end_time)` also prevent duplicate slot definitions.

#### Q3: How is real-time synchronization implemented without crashing under heavy traffic?
**Answer:** We use Socket.IO rooms partitioned by Mandi Centre ID (`centre:${centreId}`). Only clients subscribed to a particular Mandi receive event broadcasts (`queue_updated` and `token_called`). This avoids broadcasting to unaffected users and keeps network traffic minimal.

#### Q4: How are user roles and permissions enforced?
**Answer:** Roles (`farmer`, `centre_officer`, `quality_inspector`, `weighbridge_operator`) are stored in PostgreSQL. Upon sign-in, the server signs a JWT containing the user's verified database role. The backend middleware (`authenticateToken`) validates the token on protected routes. Role-based client routing automatically directs farmers to `/my-bookings` and officers to `/centre/officer`.

#### Q5: How are vehicle capacities validated?
**Answer:** Capacity limits are validated both client-side and server-side:
- Bullock Cart: Max 30 Qtl
- Mini Truck: Max 70 Qtl
- Tractor Trolley: Max 100 Qtl
- Heavy Truck: Max 300 Qtl
If a farmer inputs an oversized quantity, incompatible vehicle buttons are visually disabled with warning tags, and the backend returns a `400 Bad Request` if an invalid payload is sent.

#### Q6: How does the electronic J-Form calculation work?
**Answer:** Net Weight is calculated on the weighbridge by subtracting the empty vehicle tare weight from the loaded gross weight (`Gross - Tare = Net Weight`). The server multiplies Net Quintals by the government Minimum Support Price (MSP) rate for that commodity to compute the final payable amount, which is recorded in the `payments` table with DBT status tracking.

---

*Document generated and verified for KisanSetu MVP.*
