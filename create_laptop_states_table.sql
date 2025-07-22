-- Create laptop_states table manually
-- Run this in your Supabase SQL Editor

-- Create enum type for laptop states
DO $$ BEGIN
    CREATE TYPE laptop_state AS ENUM ('On', 'Sleep', 'Off');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create laptop_states table
CREATE TABLE IF NOT EXISTS laptop_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  state laptop_state NOT NULL DEFAULT 'On',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_activity TIMESTAMPTZ,
  battery_level INTEGER CHECK (battery_level >= 0 AND battery_level <= 100),
  is_charging BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Ensure one record per user (upsert pattern)
  UNIQUE(user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_laptop_states_user_id ON laptop_states(user_id);
CREATE INDEX IF NOT EXISTS idx_laptop_states_state ON laptop_states(state);
CREATE INDEX IF NOT EXISTS idx_laptop_states_timestamp ON laptop_states(timestamp);

-- Enable Row Level Security
ALTER TABLE laptop_states ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage their own laptop state" ON laptop_states;
DROP POLICY IF EXISTS "Admins can view all laptop states" ON laptop_states;
DROP POLICY IF EXISTS "Admins can update any laptop state" ON laptop_states;

-- RLS Policies
-- Users can view and update their own laptop state
CREATE POLICY "Users can manage their own laptop state"
  ON laptop_states FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins and managers can view all laptop states
CREATE POLICY "Admins can view all laptop states"
  ON laptop_states FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role IN ('admin', 'manager')
    )
  );

-- Admins can update any laptop state (for manual overrides)
CREATE POLICY "Admins can update any laptop state"
  ON laptop_states FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'admin'
    )
  );

-- Create or replace function to get current laptop states for all users in an organization
CREATE OR REPLACE FUNCTION get_organization_laptop_states(org_id UUID)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  email TEXT,
  state laptop_state,
  timestamp TIMESTAMPTZ,
  last_activity TIMESTAMPTZ,
  battery_level INTEGER,
  is_charging BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ls.user_id,
    u.full_name,
    u.email,
    ls.state,
    ls.timestamp,
    ls.last_activity,
    ls.battery_level,
    ls.is_charging
  FROM laptop_states ls
  JOIN users u ON ls.user_id = u.id
  WHERE u.organization_id = org_id
  ORDER BY u.full_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_organization_laptop_states(UUID) TO authenticated;

-- Insert some sample data for testing
-- This will create laptop states for all users with different states for demonstration
INSERT INTO laptop_states (user_id, state, timestamp, last_activity, battery_level, is_charging)
SELECT
  id,
  CASE
    WHEN ROW_NUMBER() OVER (ORDER BY id) % 3 = 1 THEN 'On'::laptop_state
    WHEN ROW_NUMBER() OVER (ORDER BY id) % 3 = 2 THEN 'Sleep'::laptop_state
    ELSE 'Off'::laptop_state
  END,
  now() - (RANDOM() * INTERVAL '2 hours'),
  now() - (RANDOM() * INTERVAL '30 minutes'),
  (RANDOM() * 100)::INTEGER,
  RANDOM() > 0.5
FROM users
ON CONFLICT (user_id) DO UPDATE SET
  state = EXCLUDED.state,
  timestamp = EXCLUDED.timestamp,
  last_activity = EXCLUDED.last_activity,
  battery_level = EXCLUDED.battery_level,
  is_charging = EXCLUDED.is_charging;