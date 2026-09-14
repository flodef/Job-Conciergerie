/**
 * One-shot migration: hash every device id stored in `employees.id` and
 * `conciergeries.id` with sha256 (A.4 — a DB leak must not equal a credential leak).
 *
 * - entries already hashed (64-hex, optionally `$`-prefixed) are skipped → idempotent
 * - pending markers (`$`) are preserved: `$raw` → `$sha256(raw)`
 * - reads dual-match (raw OR hash) so the app keeps working mid-migration
 *
 * Usage:
 *   bun scripts/hash-device-ids.ts          # dry-run (no writes)
 *   bun scripts/hash-device-ids.ts --apply  # write the migration
 *
 * Before running --apply against prod, take a backup:
 *   pg_dump "$PROD_DATABASE_URL" -t employees -t conciergeries -f backups/prod-pre-hash.sql
 * Rollback = restore that dump (the code keeps working — dual-match).
 */

import { hashId } from '@/app/db/db';
import { sql } from '@/app/db/db';
import { baseId, isNewDevice } from '@/app/utils/id';

const APPLY = process.argv.includes('--apply');
const HASHED = /^\$?[0-9a-f]{64}$/;

const migrateIds = (ids: string[]): { next: string[]; changed: boolean } => {
  let changed = false;
  const next = ids.map(i => {
    if (HASHED.test(i)) return i;
    changed = true;
    const h = hashId(baseId(i));
    return isNewDevice(i) ? `$${h}` : h;
  });
  return { next, changed };
};

async function migrate(table: 'employees' | 'conciergeries', keyCols: [string, string] | [string]) {
  // The UPDATEs match on the name key — duplicate key rows would all be
  // overwritten with the LAST processed row's ids. Refuse to run instead.
  const dupes =
    keyCols.length === 2
      ? await sql`SELECT first_name, family_name, count(*) c FROM employees
          GROUP BY 1,2 HAVING count(*) > 1`
      : await sql`SELECT name, count(*) c FROM conciergeries GROUP BY 1 HAVING count(*) > 1`;
  if (dupes.length)
    throw new Error(`${dupes.length} clé(s) dupliquée(s) dans ${table} (UPDATE par nom ambigu) — dédupliquer d'abord`);

  const rows = await sql`SELECT * FROM ${sql(table)}`;
  let touched = 0;
  for (const row of rows) {
    const { next, changed } = migrateIds(row.id as string[]);
    if (!changed) continue;
    touched++;
    if (APPLY) {
      if (keyCols.length === 2)
        await sql`UPDATE ${sql(table)} SET id = ${next} WHERE first_name = ${row.first_name} AND family_name = ${row.family_name}`;
      else await sql`UPDATE ${sql(table)} SET id = ${next} WHERE name = ${row.name}`;
    }
  }
  console.log(`${APPLY ? '✅ migré' : '🔍 dry-run'} ${table}: ${touched}/${rows.length} lignes à modifier`);
}

await migrate('employees', ['first_name', 'family_name']);
await migrate('conciergeries', ['name']);

if (!APPLY) console.log('\nDry-run — relancer avec --apply pour écrire.');
await sql.end();
