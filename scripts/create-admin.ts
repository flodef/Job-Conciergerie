#!/usr/bin/env bun
/**
 * create-admin.ts — one-off bootstrap of the super-admin account (Phase C.5).
 *
 * Creates:
 *   - a `clients` row "Job Conciergerie — admin" with is_admin = true
 *   - an "Admin" conciergerie attached to it (any device in its id[] resolves
 *     with session.isAdmin → unscoped tenant view + impersonation)
 *   - two v2_ device credentials — only their sha256 hashes are stored
 *
 * Prints two one-time magic links: open one on the computer, one on the phone.
 * The raw ids are NEVER stored anywhere — save the links immediately.
 *
 * Idempotent: re-running on an already-bootstrapped database is a no-op.
 *
 * Usage:
 *   PROD_DATABASE_URL=postgres://... bun scripts/create-admin.ts
 *   bun scripts/create-admin.ts --db-url postgres://...
 *   bun scripts/create-admin.ts --add-device           # mint ONE extra device link
 *   bun scripts/create-admin.ts --base-url http://localhost:3000
 *
 * Flags:
 *   --db-url <url>     target database (or PROD_DATABASE_URL / DATABASE_URL env)
 *   --add-device       append one device to the existing Admin row + print its link
 *   --base-url <url>   magic-link base (default https://www.job-conciergerie.fr)
 *   -h, --help         this help
 */

import { createHash } from 'crypto';
import postgres from 'postgres';

const CLIENT_NAME = 'Job Conciergerie — admin';
const ADMIN_ROW_NAME = 'Admin';
const DEFAULT_BASE_URL = 'https://www.job-conciergerie.fr';
const V2_ID_PREFIX = 'v2_';

// ── Output ───────────────────────────────────
const RED = '\x1b[0;31m';
const GREEN = '\x1b[0;32m';
const YELLOW = '\x1b[1;33m';
const CYAN = '\x1b[0;36m';
const RESET = '\x1b[0m';

const info = (msg: string) => console.log(`${CYAN}→ ${msg}${RESET}`);
const success = (msg: string) => console.log(`${GREEN}✓ ${msg}${RESET}`);
const warn = (msg: string) => console.log(`${YELLOW}⚠ ${msg}${RESET}`);
const fatal = (msg: string): never => {
  console.error(`${RED}✗ ${msg}${RESET}`);
  process.exit(1);
};

// ── CLI flags ────────────────────────────────
const argv = process.argv.slice(2);
const flagValue = (name: string): string | null => {
  const i = argv.indexOf(name);
  return i !== -1 && i + 1 < argv.length ? argv[i + 1] : null;
};
if (argv.includes('-h') || argv.includes('--help')) {
  console.log('Usage: bun scripts/create-admin.ts [--db-url <url>] [--add-device] [--base-url <url>]');
  process.exit(0);
}
const addDevice = argv.includes('--add-device');
const baseUrl = (flagValue('--base-url') ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
const dbUrl = flagValue('--db-url') ?? process.env.PROD_DATABASE_URL ?? process.env.DATABASE_URL;
if (!dbUrl) fatal('No database URL — pass --db-url or set PROD_DATABASE_URL.');
const targetUrl = dbUrl as string;

// Warn (without printing secrets) when the target looks like the dev database
// configured in .env.local — this script is meant for production.
try {
  const devUrl = process.env.DATABASE_URL;
  if (devUrl && devUrl !== targetUrl && new URL(devUrl).host === new URL(targetUrl).host)
    warn('Target host matches the .env.local database — is this really production?');
} catch {
  /* non-URL connection strings — skip the check */
}

// ── Credentials (local copies of app utils — no app imports so the script
//    controls its own connection) ─────────────
const generateSecureId = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return V2_ID_PREFIX + Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
};
const hashId = (id: string) => createHash('sha256').update(id).digest('hex');

const sql = postgres(targetUrl, { prepare: false, max: 1, connect_timeout: 10 });

try {
  // 1. Admin client (idempotent)
  let [client] = await sql`SELECT id FROM clients WHERE is_admin = true AND name = ${CLIENT_NAME} LIMIT 1`;
  if (!client) {
    [client] = await sql`
      INSERT INTO clients (name, plan, is_admin)
      VALUES (${CLIENT_NAME}, 'privilege', true)
      RETURNING id`;
    success(`Admin client created (${CLIENT_NAME})`);
  } else {
    info('Admin client already exists');
  }

  // 2. Admin conciergerie (idempotent)
  let [adminRow] = await sql`SELECT id, name FROM conciergeries WHERE name = ${ADMIN_ROW_NAME} LIMIT 1`;
  if (!adminRow) {
    [adminRow] = await sql`
      INSERT INTO conciergeries (id, name, email, tel, color_name, plan, client_id)
      VALUES (ARRAY[]::text[], ${ADMIN_ROW_NAME}, '', '', 'Gris', 'privilege', ${client.id})
      RETURNING id, name`;
    success(`Admin conciergerie created (${ADMIN_ROW_NAME})`);
  } else {
    info('Admin conciergerie already exists');
    // Make sure it stays attached to the admin client (idempotent repair)
    await sql`UPDATE conciergeries SET client_id = ${client.id} WHERE name = ${ADMIN_ROW_NAME} AND client_id IS DISTINCT FROM ${client.id}`;
  }

  const existingDevices = (adminRow.id as string[]).filter(i => !i.startsWith('$'));

  // 3. Device credentials — mint only on first bootstrap or explicit --add-device.
  if (existingDevices.length > 0 && !addDevice) {
    info(`Admin row already has ${existingDevices.length} connected device(s) — nothing to do.`);
    info('Lost a magic link? Re-run with --add-device to mint one extra link,');
    info('or enroll the device through the normal $-approval flow from a connected admin device.');
  } else {
    const count = addDevice ? 1 : 2;
    const ids = Array.from({ length: count }, generateSecureId);
    await sql`
      UPDATE conciergeries
      SET id = id || ${ids.map(hashId)}::text[]
      WHERE name = ${ADMIN_ROW_NAME}`;
    success(`${count} device credential(s) stored (sha256 hashes only)`);

    console.log('');
    console.log(`${YELLOW}${'─'.repeat(64)}${RESET}`);
    console.log(`${YELLOW} Magic links — shown ONCE, never stored. Save them now:${RESET}`);
    ids.forEach((id, i) => {
      const device = addDevice ? 'new device' : i === 0 ? 'computer' : 'phone';
      console.log(`\n  ${device}:\n  ${baseUrl}/${id}`);
    });
    console.log(`\n${YELLOW}${'─'.repeat(64)}${RESET}\n`);
    warn('Each link connects one device to the Admin account (4h-refreshable, revocable from Settings).');
    warn('Open each link on its own device — a link in the wrong browser still works but binds that device.');
  }
} finally {
  await sql.end();
}
