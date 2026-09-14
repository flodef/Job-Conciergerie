-- A.4 #2 — sliding-window device expiration.
-- Tracks last activity per device credential (sha256 hash — never raw ids).
-- Created lazily by app/db/deviceSeen.ts too; this file is the reference
-- for manual provisioning (e.g. Supabase SQL editor).
CREATE TABLE IF NOT EXISTS device_seen (
  device_hash text PRIMARY KEY,
  last_seen timestamptz NOT NULL DEFAULT now()
);

-- Optional one-time backfill: give every currently-listed device a clock
-- starting now (avoids entries staying clock-less forever on dormant rows).
-- Safe to re-run (ON CONFLICT DO NOTHING).
INSERT INTO device_seen (device_hash)
SELECT DISTINCT i FROM employees, unnest(id) i
ON CONFLICT (device_hash) DO NOTHING;
INSERT INTO device_seen (device_hash)
SELECT DISTINCT i FROM conciergeries, unnest(id) i
ON CONFLICT (device_hash) DO NOTHING;
