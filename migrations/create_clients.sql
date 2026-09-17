-- Phase C.1 — Multi-tenant schema (additive only, safe to re-run).
--
-- One `clients` row = one paying tenant (a business owning one or more
-- conciergeries). Every scoped table gets a nullable `client_id` FK, then a
-- single "legacy" client absorbs all existing rows → zero behaviour change:
-- current tenants keep seeing each other's data exactly as before.
--
-- Run BEFORE deploying the scoped code (the new columns are ignored by the
-- old code; the new code fails closed — NULL client_id rows are invisible to
-- scoped queries).
--
--   psql "$DATABASE_URL" -f migrations/create_clients.sql

CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  plan text NOT NULL DEFAULT 'decouverte' CHECK (plan IN ('decouverte', 'pro', 'privilege')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE conciergeries    ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id);
ALTER TABLE employees        ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id);
ALTER TABLE homes            ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id);
ALTER TABLE missions         ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id);
ALTER TABLE mission_reports  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id);
ALTER TABLE email_logs       ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id);

-- Backfill: a single legacy tenant owns everything that exists today.
-- Idempotent: only runs the inserts/updates when no client exists yet.
DO $$
DECLARE
  legacy uuid;
BEGIN
  SELECT id INTO legacy FROM clients ORDER BY created_at LIMIT 1;
  IF legacy IS NULL THEN
    INSERT INTO clients (name, email, plan)
    VALUES ('legacy', NULL, 'pro')
    RETURNING id INTO legacy;
  END IF;

  UPDATE conciergeries   SET client_id = legacy WHERE client_id IS NULL;
  UPDATE employees       SET client_id = legacy WHERE client_id IS NULL;
  UPDATE homes           SET client_id = legacy WHERE client_id IS NULL;
  UPDATE missions        SET client_id = legacy WHERE client_id IS NULL;
  UPDATE mission_reports SET client_id = legacy WHERE client_id IS NULL;
  UPDATE email_logs      SET client_id = legacy WHERE client_id IS NULL;
END $$;

-- Useful indexes for the scoped reads
CREATE INDEX IF NOT EXISTS idx_employees_client_id ON employees(client_id);
CREATE INDEX IF NOT EXISTS idx_homes_client_id ON homes(client_id);
CREATE INDEX IF NOT EXISTS idx_missions_client_id ON missions(client_id);
CREATE INDEX IF NOT EXISTS idx_mission_reports_client_id ON mission_reports(client_id);
