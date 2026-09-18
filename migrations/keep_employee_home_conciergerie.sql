-- Home conciergerie: the conciergerie an employee registered under becomes a
-- PERMANENT attribute (multi-conciergerie model). Two changes, both safe to
-- re-run:
--
-- 1. The pending->vetted trigger no longer wipes `conciergerie_name`. It was
--    introduced when the column only meant "application target"; it now carries
--    the employee's home and must survive vetting (and the claim-on-accept
--    write). `message` keeps its reset — it is only displayed while pending.
CREATE OR REPLACE FUNCTION public.reset_employee_fields_on_status_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF OLD.status = 'pending' AND NEW.status != 'pending' THEN
        RAISE NOTICE 'Resetting message for employee %', NEW.id;
        NEW.message := NULL;
        -- conciergerie_name intentionally preserved: it is the employee's
        -- immutable home conciergerie, not a transient application target.
    END IF;
    RETURN NEW;
END;
$$;

-- 2. Backfill legacy employees whose home was wiped by the old trigger (or
--    never recorded): assign each to the conciergerie they completed the most
--    missions for; ties break on the most recent completed mission. Only
--    employees with at least one completed mission get a home — the rest stay
--    unclaimed and are claimed by whichever conciergerie accepts them first.
--
--    Missions reference employees by "first_name || ' ' || family_name" (no FK)
--    so tenant scoping (client_id) is the only guard against homonyms; a
--    same-named pair inside one tenant can still be conflated — inherent to
--    the existing data model, not to this backfill.
WITH unclaimed AS (
  SELECT e.uuid, e.first_name || ' ' || e.family_name AS full_name, e.client_id
  FROM employees e
  WHERE NULLIF(e.conciergerie_name, '') IS NULL
),
ranked AS (
  SELECT
    u.uuid,
    m.conciergerie_name,
    ROW_NUMBER() OVER (
      PARTITION BY u.uuid
      ORDER BY COUNT(*) DESC, MAX(m.end_date_time) DESC, m.conciergerie_name ASC
    ) AS rn
  FROM unclaimed u
  JOIN missions m
    ON (m.employee_id = u.full_name OR m.employee_id_2 = u.full_name)
   AND m.client_id IS NOT DISTINCT FROM u.client_id
   AND m.status = 'completed'
  GROUP BY u.uuid, m.conciergerie_name
)
UPDATE employees e
SET conciergerie_name = r.conciergerie_name
FROM ranked r
WHERE e.uuid = r.uuid
  AND r.rn = 1
  AND NULLIF(e.conciergerie_name, '') IS NULL;
