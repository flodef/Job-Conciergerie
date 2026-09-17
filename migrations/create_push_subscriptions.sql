-- Web push subscriptions: one row per (device, user) pair. The endpoint is the
-- browser's push endpoint (unique per subscription); keys are the Web Push
-- encryption keys (p256dh/auth). Identity comes from the session — never from
-- client input. client_id is stored for tenant visibility/debugging only.
-- Created lazily by app/db/pushDb.ts too; this file is the reference for
-- manual provisioning (e.g. Supabase SQL editor).
CREATE TABLE IF NOT EXISTS push_subscriptions (
  endpoint text PRIMARY KEY,
  user_type text NOT NULL CHECK (user_type IN ('conciergerie', 'employee')),
  row_key text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  client_id uuid,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions (user_type, row_key);
