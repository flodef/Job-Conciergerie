#!/usr/bin/env bun
/**
 * reset-dev-db.ts
 * Optionally dumps prod DB, then restores it into dev DB.
 * Dev DATABASE_URL is read from .env.local automatically.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
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

// ── Read dev DATABASE_URL from .env.local ─────
if (!require('fs').existsSync(ENV_FILE)) {
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
const maskedDevUrl = DEV_DB_URL.replace(/@.*$/, '@***');
info(`Dev DB: ${maskedDevUrl}`);
if (DIRECT_URL) info('Using DIRECT_URL (bypasses pooler/RLS)');
else warn('No DIRECT_URL found - using DATABASE_URL (RLS may block access)');
console.log('');

// ── Ask whether to dump prod ──────────────────
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

const DUMP_PROD = await question(`${YELLOW}Dump from production DB first? [y/N] ${RESET}`);
const dumpProd = DUMP_PROD.toLowerCase() === 'y';

let dumpFile = DUMP_FILE;

if (dumpProd) {
  console.log('');
  const PROD_DB_URL = await question(`${YELLOW}Enter production DATABASE_URL: ${RESET}`);
  console.log('');

  if (!PROD_DB_URL) {
    error('No production URL provided.');
  }

  console.log('');
  info('Dumping production database...');
  try {
    execSync(
      `pg_dump --no-owner --no-acl --no-privileges --schema=public --format=plain "${PROD_DB_URL}" > "${dumpFile}"`,
      { stdio: 'pipe' },
    );
    // Remove CREATE SCHEMA statement from dump to avoid conflict
    execSync(`sed -i '/^CREATE SCHEMA public;/d' "${dumpFile}"`, { stdio: 'pipe' });
    success(`Dump saved to ${dumpFile}`);
  } catch (e) {
    error('pg_dump failed. Check your production connection string.');
  }
} else {
  // Ask for an existing dump file
  console.log('');
  const DUMP_FILE_INPUT = await question(`${YELLOW}Path to existing SQL dump file (leave blank to abort): ${RESET}`);
  if (!DUMP_FILE_INPUT) {
    warn('Aborted.');
    rl.close();
    process.exit(0);
  }
  dumpFile = DUMP_FILE_INPUT.replace(/^~/, process.env.HOME || '.');

  // Check if it's a directory
  if (require('fs').existsSync(dumpFile) && statSync(dumpFile).isDirectory()) {
    const files = readdirSync(dumpFile);
    if (files.length === 0) {
      error(`Directory is empty: ${dumpFile}`);
    } else if (files.length === 1) {
      dumpFile = resolve(dumpFile, files[0]);
      success(`Using dump: ${dumpFile}`);
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
    if (!require('fs').existsSync(dumpFile)) {
      error(`File not found: ${dumpFile}`);
    }
    success(`Using dump: ${dumpFile}`);
  }
}

// ── Safety confirmation ───────────────────────
console.log('');
warn('This will ERASE and replace all data in your dev database.');
const CONFIRM = await question(`${RED}Type 'yes' to confirm: ${RESET}`);
if (CONFIRM !== 'yes') {
  warn('Aborted.');
  rl.close();
  process.exit(0);
}

// ── Drop & recreate the public schema ────────
console.log('');
info('Resetting public schema in dev database...');
try {
  execSync(`psql "${RESTORE_URL}" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"`, {
    stdio: 'pipe',
  });
  success('Schema reset.');
} catch (e) {
  error('Failed to reset schema. Check your dev connection string.');
}

// ── Restore dump into dev ─────────────────────
info('Restoring dump into dev database...');
try {
  execSync(`psql "${RESTORE_URL}" -f "${dumpFile}"`, { stdio: 'inherit' });
  success('Restore complete!');
} catch (e) {
  error('psql restore failed. The dump file may be incompatible.');
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
} catch (e) {
  warn('Could not verify tables (this may be okay if restore succeeded)');
}

console.log('');
success('Dev database has been reset successfully.');
success('You need to enable runtime feature in Supabase for conciergeries, employees, homes and missions tables.');
success('You also need to restart the dev server and do a hard refresh (Ctrl+F5) to clear any cached data.');
console.log('');

rl.close();
