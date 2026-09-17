-- Subscription plan per conciergerie ('decouverte' | 'pro' | 'privilege').
-- Additive and safe to re-run. All existing rows get 'pro' — the plan chosen by
-- CMD, Calluna and Mentheréglisse at this time.
ALTER TABLE conciergeries
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'pro'
  CHECK (plan IN ('decouverte', 'pro', 'privilege'));
