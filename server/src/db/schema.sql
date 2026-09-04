-- KisanSetu / SIH 2026 Agricultural Procurement Database Schema

-- Enable UUID extension if supported
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table (Farmers, Centre Officers, Quality Inspectors, Weighbridge Operators, Admins)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    phone VARCHAR(15) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE,
    role VARCHAR(30) NOT NULL DEFAULT 'farmer', -- 'farmer', 'centre_officer', 'quality_inspector', 'weighbridge_operator', 'admin'
    password_hash VARCHAR(255) NOT NULL,
    state VARCHAR(60) NOT NULL,
    district VARCHAR(60) NOT NULL,
    village VARCHAR(100),
    aadhaar_last4 VARCHAR(4),
    bank_account_last4 VARCHAR(4),
    ifsc_code VARCHAR(15),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Procurement Centres Table (Mandis / PACCS / Warehouse Centres)
CREATE TABLE IF NOT EXISTS centres (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(30) UNIQUE NOT NULL,
    state VARCHAR(60) NOT NULL,
    district VARCHAR(60) NOT NULL,
    address TEXT NOT NULL,
    latitude NUMERIC(10, 6) DEFAULT 28.6139,
    longitude NUMERIC(10, 6) DEFAULT 77.2090,
    daily_capacity_quintals INTEGER NOT NULL DEFAULT 5000,
    max_concurrent_trucks INTEGER NOT NULL DEFAULT 10,
    supported_crops JSONB NOT NULL DEFAULT '["Wheat", "Paddy", "Mustard", "Gram", "Maize", "Cotton"]',
    is_active BOOLEAN DEFAULT TRUE,
    manager_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Time Slots Table (Hourly / 2-hour capacity buckets per Centre per Date)
CREATE TABLE IF NOT EXISTS slots (
    id VARCHAR(64) PRIMARY KEY,
    centre_id VARCHAR(64) NOT NULL REFERENCES centres(id) ON DELETE CASCADE,
    slot_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    max_capacity_quintals INTEGER NOT NULL DEFAULT 1000,
    booked_capacity_quintals INTEGER NOT NULL DEFAULT 0,
    max_tokens INTEGER NOT NULL DEFAULT 20,
    booked_tokens INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN', -- 'OPEN', 'FULL', 'CLOSED', 'PAUSED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_centre_slot_window UNIQUE (centre_id, slot_date, start_time, end_time)
);

-- 4. Bookings & Token Management
CREATE TABLE IF NOT EXISTS bookings (
    id VARCHAR(64) PRIMARY KEY,
    token_number VARCHAR(30) UNIQUE NOT NULL, -- e.g. "MND-WHT-042"
    farmer_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    centre_id VARCHAR(64) NOT NULL REFERENCES centres(id) ON DELETE CASCADE,
    slot_id VARCHAR(64) NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
    crop_name VARCHAR(60) NOT NULL,
    crop_variety VARCHAR(60) DEFAULT 'Standard FAQ',
    estimated_quantity_quintals NUMERIC(10, 2) NOT NULL,
    vehicle_type VARCHAR(40) NOT NULL DEFAULT 'Tractor Trolley', -- 'Tractor Trolley', 'Mini Truck (Tata Ace)', 'Heavy Truck', 'Bullock Cart'
    vehicle_number VARCHAR(20) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'BOOKED', 
    -- Status progression:
    -- 'BOOKED' -> 'CHECKED_IN' -> 'CALLED' -> 'QUALITY_INSPECTION' -> 'WEIGHING' -> 'UNLOADING' -> 'PROCURED' (or 'REJECTED', 'CANCELLED')
    current_station VARCHAR(40) DEFAULT 'WAITING_AREA', -- 'WAITING_AREA', 'GATE', 'QUALITY_LAB', 'WEIGHBRIDGE_1', 'UNLOADING_BAY_A', 'DISPATCH'
    qr_code_hash VARCHAR(255) NOT NULL,
    check_in_time TIMESTAMP WITH TIME ZONE,
    called_time TIMESTAMP WITH TIME ZONE,
    completion_time TIMESTAMP WITH TIME ZONE,
    rejection_stage VARCHAR(60), -- 'QUALITY_INSPECTION', 'WEIGHBRIDGE', 'GATE'
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ensure columns exist in existing PostgreSQL databases (Backward-compatible non-destructive migrations)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS rejection_stage VARCHAR(60);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS dob VARCHAR(30);
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS crops JSONB DEFAULT '[]';
ALTER TABLE users ADD COLUMN IF NOT EXISTS centre_id VARCHAR(64);
ALTER TABLE users ADD COLUMN IF NOT EXISTS designation VARCHAR(100);
ALTER TABLE centres ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20);
ALTER TABLE centres ADD COLUMN IF NOT EXISTS operating_hours VARCHAR(100) DEFAULT '08:00 AM - 06:00 PM';

-- 5. Quality Inspection Checks
CREATE TABLE IF NOT EXISTS quality_checks (
    id VARCHAR(64) PRIMARY KEY,
    booking_id VARCHAR(64) UNIQUE NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    inspector_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    moisture_percentage NUMERIC(5, 2) NOT NULL DEFAULT 12.0,
    foreign_matter_percentage NUMERIC(5, 2) NOT NULL DEFAULT 1.0,
    damaged_grains_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.5,
    grain_grade VARCHAR(20) NOT NULL DEFAULT 'GRADE_A', -- 'GRADE_A', 'GRADE_B', 'FAQ', 'REJECTED'
    approved_quantity_quintals NUMERIC(10, 2),
    deductions_quintals NUMERIC(10, 2) DEFAULT 0.0,
    remarks TEXT,
    inspected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Weighbridge Weight Logs
CREATE TABLE IF NOT EXISTS weighbridge_logs (
    id VARCHAR(64) PRIMARY KEY,
    booking_id VARCHAR(64) UNIQUE NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    operator_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    gross_weight_kg NUMERIC(12, 2) NOT NULL, -- Loaded vehicle
    tare_weight_kg NUMERIC(12, 2) DEFAULT 0, -- Empty vehicle after unload
    net_weight_kg NUMERIC(12, 2) DEFAULT 0,
    net_weight_quintals NUMERIC(10, 2) DEFAULT 0,
    gross_weighed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    tare_weighed_at TIMESTAMP WITH TIME ZONE
);

-- 7. Procurement Receipts & DBT Payments
CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(64) PRIMARY KEY,
    booking_id VARCHAR(64) UNIQUE NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    receipt_number VARCHAR(40) UNIQUE NOT NULL, -- e.g. "JFORM-2026-0094"
    msp_rate_per_quintal NUMERIC(10, 2) NOT NULL DEFAULT 2275.00,
    gross_amount NUMERIC(12, 2) NOT NULL,
    deductions_amount NUMERIC(10, 2) DEFAULT 0.00,
    net_payable_amount NUMERIC(12, 2) NOT NULL,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'PROCESSING', 'TRANSFERRED', 'FAILED'
    transaction_ref VARCHAR(60),
    bank_account_last4 VARCHAR(4),
    ifsc_code VARCHAR(15),
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Queue Audit Log (Traceability)
CREATE TABLE IF NOT EXISTS queue_audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    booking_id VARCHAR(64) NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    from_status VARCHAR(30),
    to_status VARCHAR(30) NOT NULL,
    station VARCHAR(40),
    changed_by_id VARCHAR(64),
    notes TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for lightning-fast queries during heavy Mandi queue traffic
CREATE INDEX IF NOT EXISTS idx_bookings_centre_status ON bookings(centre_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_farmer ON bookings(farmer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_token ON bookings(token_number);
CREATE INDEX IF NOT EXISTS idx_slots_centre_date ON slots(centre_id, slot_date);
