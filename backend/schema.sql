-- SQL Schema for Supabase Tables
-- Copy and paste this script in your Supabase SQL Editor to create the necessary tables.

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop tables if they exist (clean setup)
-- DROP TABLE IF EXISTS expenses;
-- DROP TABLE IF EXISTS trips;

-- Create Trips table
CREATE TABLE trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source VARCHAR(255) NOT NULL,
    destination VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    duration INTEGER NOT NULL,
    budget NUMERIC(10, 2) NOT NULL,
    interests TEXT[] NOT NULL,
    itinerary JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Expenses table
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    category VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable Row Level Security (RLS) if desired. For ease of local testing,
-- you can set RLS to disabled, or add standard public access policies.
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Allow public read/write access policies (for development testing)
CREATE POLICY "Allow public read access on trips" ON trips FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on trips" ON trips FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on trips" ON trips FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on trips" ON trips FOR DELETE USING (true);

CREATE POLICY "Allow public read access on expenses" ON expenses FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on expenses" ON expenses FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on expenses" ON expenses FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on expenses" ON expenses FOR DELETE USING (true);
