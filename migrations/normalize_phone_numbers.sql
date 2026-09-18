-- Normalize all stored phone numbers to the canonical French national format
-- (0XXXXXXXXX) enforced by frenchPhoneRegex. Legacy rows may carry separators
-- ("06 12 34 56 78") or international prefixes ("+336…", "00336…") — writes
-- already normalize via normalizePhone, this backfills pre-existing rows.
--
-- Mirrors normalizePhone in app/utils/regex.ts exactly:
--   strip non-digits → "0033…" becomes "0" + rest → "+33…" (11 digits) becomes
--   "0" + rest → anything else keeps its digits.
--
-- Idempotent: already-normalized numbers are untouched. Rows that would
-- collide on unique_employee_tel are skipped with a NOTICE for manual cleanup
-- (the CASE-normalizing lookup in findEmployeeByContact still matches them).

DO $$
DECLARE
  r record;
  n text;
BEGIN
  FOR r IN SELECT ctid, tel FROM employees LOOP
    n := CASE
      WHEN regexp_replace(r.tel, '[^0-9]', '', 'g') LIKE '0033%'
        THEN '0' || substring(regexp_replace(r.tel, '[^0-9]', '', 'g') from 5)
      WHEN regexp_replace(r.tel, '[^0-9]', '', 'g') LIKE '33%'
         AND length(regexp_replace(r.tel, '[^0-9]', '', 'g')) = 11
        THEN '0' || substring(regexp_replace(r.tel, '[^0-9]', '', 'g') from 3)
      ELSE regexp_replace(r.tel, '[^0-9]', '', 'g')
    END;
    IF n IS NOT NULL AND n <> r.tel THEN
      BEGIN
        UPDATE employees SET tel = n WHERE ctid = r.ctid;
      EXCEPTION WHEN unique_violation THEN
        RAISE NOTICE 'employees.tel collision: % -> % (row skipped)', r.tel, n;
      END;
    END IF;
  END LOOP;

  FOR r IN SELECT ctid, tel FROM conciergeries LOOP
    n := CASE
      WHEN regexp_replace(r.tel, '[^0-9]', '', 'g') LIKE '0033%'
        THEN '0' || substring(regexp_replace(r.tel, '[^0-9]', '', 'g') from 5)
      WHEN regexp_replace(r.tel, '[^0-9]', '', 'g') LIKE '33%'
         AND length(regexp_replace(r.tel, '[^0-9]', '', 'g')) = 11
        THEN '0' || substring(regexp_replace(r.tel, '[^0-9]', '', 'g') from 3)
      ELSE regexp_replace(r.tel, '[^0-9]', '', 'g')
    END;
    IF n IS NOT NULL AND n <> r.tel THEN
      UPDATE conciergeries SET tel = n WHERE ctid = r.ctid;
    END IF;
  END LOOP;
END $$;
