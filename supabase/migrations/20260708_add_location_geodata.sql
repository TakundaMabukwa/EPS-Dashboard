-- Add location_geodata JSONB column to trips table
-- Stores geocoded coordinates and town names for pickup, dropoff, and stops
ALTER TABLE trips ADD COLUMN IF NOT EXISTS location_geodata jsonb DEFAULT NULL;
