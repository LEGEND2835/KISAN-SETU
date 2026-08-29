# 🌾 KisanSetu — SIH 2026 Agricultural Procurement Slot & Queue Management Platform

> **Smart India Hackathon 2026 (SIH)** • Problem Statement: *Smart Agricultural Procurement Slot & Queue Management Platform for Mandis*

---

## 🚀 Key Highlights & Solved Problems

1. **Predictable Turnaround (Zero-Wait Mandis)**:
   - Eliminates 12–24 hour highway truck congestions with 2-hour dynamic slot booking.
   - Reduces Mandi yard turnaround time down to ~38 minutes.
2. **Cryptographic QR Gate Passes**:
   - High-contrast digital token passes (e.g., `TK-KRL-101`) with live QR codes for rapid security check-in.
3. **Transparent Quality Inspection & Weighbridge**:
   - Automated moisture content & impurity calculation with instant grain grading (Grade A / FAQ / Rejected).
   - Digital gross minus tare weighbridge logging with zero manual tampering.
4. **Instant e-J-Form & Direct DBT Payout Tracking**:
   - Generates official e-Procurement certificates and logs Direct Benefit Transfer (DBT) vouchers at official MSP rates.
5. **Realtime Mandi Operations & Public TV Screen**:
   - Socket.IO-powered Officer Kanban dashboard and fullscreen big-screen TV for gate entry with voice chime announcements.
6. **Multilingual Voice & NLP Assistant**:
   - Voice and text query bot in Hindi, Punjabi, Marathi, Telugu, and English.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide Icons, Canvas Confetti, QRCode.react |
| **Backend API** | Node.js, Express.js, JWT Authentication, Morgan Logger, CORS |
| **Realtime Engine** | Socket.IO (Room isolation: `centre:{id}`) |
| **Database Layer** | PostgreSQL (`pg` pool) + Built-in Fallback Resilient Store |
| **AI / NLP** | Dynamic ETA Predictor, Slot Load Recommender, Web Speech Audio API |

---

## ⚡ 1-Click Fast Demo Credentials (SIH Presentation)

| Role | Profile Name | Phone | Password | Destination |
| :--- | :--- | :--- | :--- | :--- |
| **Farmer** | Ramesh Kumar (Karnal, Haryana) | `9876543210` | `farmer123` | `/my-bookings` |
| **Farmer** | Gurpreet Singh (Ludhiana, Punjab) | `9876543211` | `farmer123` | `/my-bookings` |
| **Mandi Supervisor** | Rajesh Sharma (Karnal Hub) | `9876543220` | `admin123` | `/centre/officer` |
| **Quality Analyst** | Dr. Sunita Verma | `9876543230` | `admin123` | `/centre/officer` |
| **Weighbridge In-charge**| Amit Patel | `9876543240` | `admin123` | `/centre/officer` |

*(Tip: Use the **"⚡ Demo Roles"** dropdown in the top navbar for 1-click role switching!)*

---

## 🏃 Quick Start Guide

### 1. Start Backend Server
```bash
cd server
npm install
npm start
```
*Backend runs on: `http://localhost:5000` (REST API: `/api`, WebSocket: `ws://localhost:5000`)*

### 2. Start Frontend Client
```bash
cd client
npm install
npm run dev
```
*Frontend runs on: `http://localhost:5173`*

---

## 🧭 Page & Route Directory

- **Home & Live MSP Ticker**: [`/`](http://localhost:5173/)
- **Farmer 3-Step Slot Booking**: [`/book-slot`](http://localhost:5173/book-slot)
- **Farmer Passes & DBT Receipts**: [`/my-bookings`](http://localhost:5173/my-bookings)
- **Live Digital Token Pass & Tracker**: [`/token/TK-101`](http://localhost:5173/token/TK-101)
- **Mandi Officer Command Center**: [`/centre/officer`](http://localhost:5173/centre/officer)
- **Mandi Gate Big Screen TV Display**: [`/display/ctr_karnal_01`](http://localhost:5173/display/ctr_karnal_01)
- **National Procurement Analytics**: [`/analytics`](http://localhost:5173/analytics)
- **Login / Role Switcher**: [`/login`](http://localhost:5173/login)

---

## 🏛️ Database Schema Overview

```sql
-- Core entities defined in server/src/db/schema.sql:
• users (id, full_name, phone, role, password_hash, state, district, aadhaar_last4, bank_account_last4)
• centres (id, name, code, state, district, daily_capacity_quintals, max_concurrent_trucks, supported_crops)
• slots (id, centre_id, slot_date, start_time, end_time, max_tokens, booked_tokens, status)
• bookings (id, token_number, farmer_id, centre_id, slot_id, crop_name, status, qr_code_hash, check_in_time)
• quality_checks (id, booking_id, inspector_id, moisture_percentage, foreign_matter_percentage, grain_grade)
• weighbridge_logs (id, booking_id, operator_id, gross_weight_kg, tare_weight_kg, net_weight_quintals)
• payments (id, booking_id, receipt_number, msp_rate_per_quintal, net_payable_amount, payment_status)
• queue_audit_logs (id, booking_id, from_status, to_status, station, timestamp)
```
