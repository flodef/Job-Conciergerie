-- Per-person reviews: one row per (user_type, row_key), editable/deletable at
-- any time. Identity comes from the session rowKey (conciergerie name, or
-- employee "firstName familyName") — never from client input.
-- Created lazily by app/db/reviewDb.ts too; this file is the reference for
-- manual provisioning (e.g. Supabase SQL editor).
CREATE TABLE IF NOT EXISTS reviews (
  user_type text NOT NULL CHECK (user_type IN ('conciergerie', 'employee')),
  row_key text NOT NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 0 AND 5),
  comment text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_type, row_key)
);
