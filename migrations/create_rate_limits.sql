-- Rate limiting counters for sensitive server actions (see app/db/rateLimit.ts).
-- The app also creates this table lazily on first use; this file documents the
-- schema for manual provisioning.
CREATE TABLE IF NOT EXISTS rate_limits (
  key text PRIMARY KEY,                -- sha256(`${action}|${ip|scope}`) — no clear IP at rest
  count integer NOT NULL,
  window_start timestamptz NOT NULL DEFAULT now()
);

-- Optional housekeeping: drop stale windows (can be run from the cron route).
-- DELETE FROM rate_limits WHERE window_start < now() - interval '1 day';
