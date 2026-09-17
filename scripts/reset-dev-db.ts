#!/usr/bin/env bun
/**
 * reset-dev-db.ts
 * Optionally dumps prod DB, then restores it into dev DB.
 * Dev DATABASE_URL is read from .env.local automatically.
 *
 * Usage:
 *   bun scripts/reset-dev-db.ts                     # interactive
 *   bun scripts/reset-dev-db.ts --dump dump.sql -y  # restore an existing dump
 *   PROD_DATABASE_URL=postgres://... bun scripts/reset-dev-db.ts -y
 *                                                   # dump prod, restore to dev
 *
 * Flags:
 *   --prod-url <url>   prod connection string (or PROD_DATABASE_URL env)
 *   --dump <file|dir>  restore an existing dump instead of dumping prod
 *   -y, --yes          skip the destructive-action confirmation
 *                      (required when stdin is not a TTY)
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';
import * as readline from 'readline';

const SCRIPT_DIR = new URL('.', import.meta.url).pathname;
const ROOT_DIR = resolve(SCRIPT_DIR, '..');
const ENV_FILE = resolve(ROOT_DIR, '.env.local');
const DUMP_FILE = `/tmp/prod_dump_${new Date().toISOString().replace(/[:.]/g, '')}.sql`;

// ── Colors ───────────────────────────────────
const RED = '\x1b[0;31m';
const GREEN = '\x1b[0;32m';
const YELLOW = '\x1b[1;33m';
const CYAN = '\x1b[0;36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

const info = (msg: string) => console.log(`${CYAN}→ ${msg}${RESET}`);
const success = (msg: string) => console.log(`${GREEN}✓ ${msg}${RESET}`);
const warn = (msg: string) => console.log(`${YELLOW}⚠ ${msg}${RESET}`);
const error = (msg: string) => {
  console.error(`${RED}✗ ${msg}${RESET}`);
  process.exit(1);
};

const maskUrl = (url: string) => url.replace(/:([^:@/]+)@/, ':***@').replace(/@.*$/, '@***');

// ── CLI flags ────────────────────────────────
const argv = process.argv.slice(2);
const flagValue = (name: string): string | null => {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : null;
};
const PROD_URL_ARG = flagValue('--prod-url') ?? process.env.PROD_DATABASE_URL ?? null;
const DUMP_ARG = flagValue('--dump') ?? null;
const YES = argv.includes('-y') || argv.includes('--yes') || process.env.YES === '1';
const NON_INTERACTIVE = !process.stdin.isTTY;

if (argv.includes('--help') || argv.includes('-h')) {
  console.log(`Usage: bun scripts/reset-dev-db.ts [--prod-url <url> | --dump <file>] [-y]

  --prod-url <url>   prod connection string (or PROD_DATABASE_URL env)
  --dump <file|dir>  restore an existing dump instead of dumping prod
  -y, --yes          skip the destructive-action confirmation`);
  process.exit(0);
}

// ── Read dev DATABASE_URL from .env.local ─────
if (!existsSync(ENV_FILE)) {
  error(`.env.local not found at ${ENV_FILE}`);
}

const envContent = readFileSync(ENV_FILE, 'utf-8');
const devDbUrlMatch = envContent.match(/^DATABASE_URL=(.*)$/m);
if (!devDbUrlMatch || !devDbUrlMatch[1]) {
  error('DATABASE_URL not found in .env.local');
}

const DEV_DB_URL = devDbUrlMatch![1].replace(/['"]/g, '');

// Check for direct URL (bypasses pooler and RLS)
const directUrlMatch = envContent.match(/^DIRECT_URL=(.*)$/m);
const DIRECT_URL = directUrlMatch ? directUrlMatch[1].replace(/['"]/g, '') : null;

// Use direct URL if available, otherwise fall back to DATABASE_URL
const RESTORE_URL = DIRECT_URL || DEV_DB_URL;

console.log('');
console.log(`${BOLD}╔══════════════════════════════════════╗${RESET}`);
console.log(`${BOLD}║        Dev DB Reset Utility          ║${RESET}`);
console.log(`${BOLD}╚══════════════════════════════════════╝${RESET}`);
console.log('');
info(`Dev DB: ${maskUrl(DEV_DB_URL)}`);
if (DIRECT_URL) info('Using DIRECT_URL (bypasses pooler/RLS)');
else warn('No DIRECT_URL found - using DATABASE_URL (RLS may block access)');
console.log('');

// ── Interactive prompt helper ────────────────
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (prompt: string): Promise<string> => {
  return new Promise(resolve => {
    rl.question(prompt, answer => {
      resolve(answer);
    });
  });
};

// ── Resolve the dump source ───────────────────
let dumpFile = DUMP_FILE;

if (DUMP_ARG) {
  // --dump <file|dir>: explicit existing dump
  dumpFile = DUMP_ARG.replace(/^~/, process.env.HOME || '.');
} else if (PROD_URL_ARG) {
  // --prod-url / PROD_DATABASE_URL: dump prod non-interactively
  info(`Dumping production DB ${maskUrl(PROD_URL_ARG)}...`);
  try {
    execSync(
      `pg_dump --no-owner --no-acl --no-privileges --schema=public --format=plain "${PROD_URL_ARG}" > "${dumpFile}"`,
      { stdio: 'pipe' },
    );
    // CREATE SCHEMA conflicts with the existing schema, and set_config('search_path')
    // leaks onto pooled backends (Supabase transaction pooler reuses them).
    execSync(
      `sed -i '/^CREATE SCHEMA public;/d; /^SELECT pg_catalog.set_config('"'"'search_path'"'"'/d' "${dumpFile}"`,
      { stdio: 'pipe' },
    );
    success(`Dump saved to ${dumpFile}`);
  } catch {
    error('pg_dump failed. Check your production connection string.');
  }
} else if (NON_INTERACTIVE) {
  error('Non-interactive mode: pass --prod-url <url> (or PROD_DATABASE_URL) or --dump <file>, plus -y.');
} else {
  // Interactive: ask whether to dump prod or restore an existing file
  const DUMP_PROD = await question(`${YELLOW}Dump from production DB first? [y/N] ${RESET}`);

  if (DUMP_PROD.toLowerCase() === 'y') {
    console.log('');
    const PROD_DB_URL = await question(`${YELLOW}Enter production DATABASE_URL: ${RESET}`);
    console.log('');

    if (!PROD_DB_URL) {
      error('No production URL provided.');
    }

    info('Dumping production database...');
    try {
      execSync(
        `pg_dump --no-owner --no-acl --no-privileges --schema=public --format=plain "${PROD_DB_URL}" > "${dumpFile}"`,
        { stdio: 'pipe' },
      );
      execSync(
        `sed -i '/^CREATE SCHEMA public;/d; /^SELECT pg_catalog.set_config('"'"'search_path'"'"'/d' "${dumpFile}"`,
        { stdio: 'pipe' },
      );
      success(`Dump saved to ${dumpFile}`);
    } catch {
      error('pg_dump failed. Check your production connection string.');
    }
  } else {
    const DUMP_FILE_INPUT = await question(`${YELLOW}Path to existing SQL dump file (leave blank to abort): ${RESET}`);
    if (!DUMP_FILE_INPUT) {
      warn('Aborted.');
      rl.close();
      process.exit(0);
    }
    dumpFile = DUMP_FILE_INPUT.replace(/^~/, process.env.HOME || '.');
  }
}

// Resolve directories to a single dump file
if (existsSync(dumpFile) && statSync(dumpFile).isDirectory()) {
  const files = readdirSync(dumpFile);
  if (files.length === 0) {
    error(`Directory is empty: ${dumpFile}`);
  } else if (files.length === 1) {
    dumpFile = resolve(dumpFile, files[0]);
    success(`Using dump: ${dumpFile}`);
  } else if (NON_INTERACTIVE) {
    error(`Directory ${dumpFile} contains ${files.length} files — pass a file path, not a directory.`);
  } else {
    console.log('');
    info(`Found ${files.length} files in directory:`);
    files.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file}`);
    });
    const selection = await question(`${YELLOW}Select file number: ${RESET}`);
    const fileIndex = parseInt(selection, 10) - 1;
    if (isNaN(fileIndex) || fileIndex < 0 || fileIndex >= files.length) {
      error('Invalid selection.');
    }
    dumpFile = resolve(dumpFile, files[fileIndex]);
    success(`Using dump: ${dumpFile}`);
  }
} else {
  if (!existsSync(dumpFile)) {
    error(`File not found: ${dumpFile}`);
  }
  success(`Using dump: ${dumpFile}`);
}

// ── Safety confirmation ───────────────────────
console.log('');
warn('This will ERASE and replace all data in your dev database.');
if (YES) {
  info('Confirmed via --yes.');
} else if (NON_INTERACTIVE) {
  error('Non-interactive mode requires -y/--yes to confirm the destructive reset.');
} else {
  const CONFIRM = await question(`${RED}Type 'yes' to confirm: ${RESET}`);
  if (CONFIRM !== 'yes') {
    warn('Aborted.');
    rl.close();
    process.exit(0);
  }
}

// ── Drop & recreate the public schema ────────
console.log('');
info('Resetting public schema in dev database...');
try {
  execSync(`psql "${RESTORE_URL}" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"`, {
    stdio: 'pipe',
  });
  success('Schema reset.');
} catch {
  error('Failed to reset schema. Check your dev connection string.');
}

// ── Restore dump into dev ─────────────────────
info('Restoring dump into dev database...');
try {
  execSync(`psql "${RESTORE_URL}" -f "${dumpFile}"`, { stdio: 'inherit' });
  success('Restore complete!');
} catch {
  error('psql restore failed. The dump file may be incompatible.');
}

// ── Clean pooled backends ─────────────────────
// Session-level state (search_path etc.) can leak onto Supabase pooled
// backends; DISCARD ALL on a few connections resets whichever we land on.
try {
  for (let i = 0; i < 6; i++) execSync(`psql "${RESTORE_URL}" -c "DISCARD ALL"`, { stdio: 'pipe' });
} catch {
  warn('Could not reset pooled backends (usually harmless).');
}

// ── Verify tables were restored ───────────────
info('Verifying tables were restored...');
try {
  const tablesCheck = execSync(
    `psql "${RESTORE_URL}" -t -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"`,
    { encoding: 'utf-8' },
  );
  const tables = tablesCheck
    .trim()
    .split('\n')
    .map(t => t.trim().toLowerCase())
    .filter(t => t);
  success(`Found ${tables.length} tables in public schema: ${tables.join(', ')}`);

  const requiredTables = ['employees', 'conciergeries', 'missions', 'homes'];
  const missingTables = requiredTables.filter(t => !tables.includes(t.toLowerCase()));
  if (missingTables.length > 0) {
    error(`Missing required tables: ${missingTables.join(', ')}`);
  }
} catch {
  warn('Could not verify tables (this may be okay if restore succeeded)');
}

console.log('');
success('Dev database has been reset successfully.');
success('You need to enable runtime feature in Supabase for conciergeries, employees, homes and missions tables.');
success('You also need to restart the dev server and do a hard refresh (Ctrl+F5) to clear any cached data.');
console.log('');

rl.close();
