-- Migration: Webhook Events Table for Idempotency
-- Description: Creates table to track processed webhook events from Persona
-- This prevents duplicate processing of webhook events

-- Create webhook_events table
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  event_name TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups by event_id (used for idempotency checks)
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON webhook_events(event_id);

-- Index for querying by event name
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_name ON webhook_events(event_name);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at DESC);

-- RLS Policies (only service role can access)
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role full access to webhook_events"
  ON webhook_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE webhook_events IS 'Tracks processed Persona webhook events for idempotency. Only accessible by service role.';
