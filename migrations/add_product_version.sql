-- Product versioning: per-conciergerie feature generation ('v2' | 'v3').
--
-- v2 = existing clients — the app as they know it, bugfix maintenance only.
-- v3 = new features. New clients and the demo land on v3 automatically
--      thanks to the column DEFAULT.
-- v2 clients see v3 features locked (preview only). Upgrading to v3 means
-- paying the full plan price — the negotiated discount does not survive:
--   UPDATE conciergeries SET version='v3', discount=0 WHERE name='<name>';
--
-- Note: the 'v2_' device-id prefix (app/utils/id.ts) is unrelated — this is
-- the product generation, not a credential format.

ALTER TABLE conciergeries
    ADD COLUMN IF NOT EXISTS version text NOT NULL DEFAULT 'v3'
        CHECK (version IN ('v2', 'v3'));

-- Rows existing at migration time are the current clients → v2.
UPDATE conciergeries SET version = 'v2';

-- The admin tenant always runs the latest generation.
UPDATE conciergeries SET version = 'v3' WHERE name = 'Admin';
