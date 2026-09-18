-- Scope conciergerie color uniqueness to the group (client) instead of the
-- whole platform.
--
-- Colors distinguish conciergeries inside a shared group (employee/mission
-- lists). With the global UNIQUE(color_name) the 6-color palette capped the
-- ENTIRE platform at 6 conciergeries. Per-client uniqueness keeps colors
-- distinct where it matters (inside a group) while letting different groups
-- reuse the palette. A group is still capped at 6 members — revisit the
-- palette if a group ever needs more.
--
-- NULL client_id rows are unaffected: Postgres treats NULLs as distinct, so
-- unscoped rows can share colors (same behavior as today, minus the cap).

BEGIN;

ALTER TABLE public.conciergeries
    DROP CONSTRAINT IF EXISTS unique_color_name;

ALTER TABLE public.conciergeries
    ADD CONSTRAINT unique_color_name_per_client UNIQUE (client_id, color_name);

COMMIT;
