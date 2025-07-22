/*
  # Laptop States Table Migration

  This migration adds a new table to track real-time laptop states for employees.
  The table stores the current state (On, Sleep, Off) for each user along with
  additional metadata like battery level and last activity timestamp.
*/

-- Create enum type for laptop states
CREATE TYPE laptop_state AS ENUM ('On', 'Sleep', 'Off');

-- Create laptop_states table
CREATE TABLE laptop_states (
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
CREATE INDEX idx_laptop_states_user_id ON laptop_states(user_id);
CREATE INDEX idx_laptop_states_state ON laptop_states(state);
CREATE INDEX idx_laptop_states_timestamp ON laptop_states(timestamp);

-- Enable Row Level Security
ALTER TABLE laptop_states ENABLE ROW LEVEL SECURITY;

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

-- Add trigger to update the updated_at timestamp
CREATE TRIGGER update_laptop_states_updated_at
  BEFORE UPDATE ON laptop_states
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Create a function to get current laptop states for all users in an organization
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