#!/usr/bin/env bun
/**
 * check-db.ts
 * Simple script to check database connection and list tables
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';

const SCRIPT_DIR = new URL('.', import.meta.url).pathname;
const ROOT_DIR = resolve(SCRIPT_DIR, '..');
const ENV_FILE = resolve(ROOT_DIR, '.env.local');

const envContent = readFileSync(ENV_FILE, 'utf-8');
const devDbUrlMatch = envContent.match(/^DATABASE_URL=(.*)$/m);
if (!devDbUrlMatch || !devDbUrlMatch[1]) {
  console.error('DATABASE_URL not found in .env.local');
  process.exit(1);
}

const DEV_DB_URL = devDbUrlMatch[1].replace(/['"]/g, '');

console.log('Checking database connection...');
console.log('DATABASE_URL:', DEV_DB_URL.replace(/@.*$/, '@***'));
console.log('');

try {
  // Test connection
  console.log('Testing connection...');
  const result = execSync(`psql "${DEV_DB_URL}" -c "SELECT version();" -t`, { encoding: 'utf-8' });
  console.log('✓ Connected successfully');
  console.log('PostgreSQL version:', result.trim());
  console.log('');

  // List schemas
  console.log('Listing schemas...');
  const schemas = execSync(`psql "${DEV_DB_URL}" -c "\\dn" -t`, { encoding: 'utf-8' });
  console.log(schemas);
  console.log('');

  // List tables in public schema
  console.log('Listing tables in public schema...');
  const tables = execSync(
    `psql "${DEV_DB_URL}" -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename" -t`,
    { encoding: 'utf-8' },
  );
  console.log(tables);
  console.log('');

  // Count rows in key tables
  const keyTables = ['conciergeries', 'employees', 'homes', 'missions'];
  for (const table of keyTables) {
    try {
      const count = execSync(`psql "${DEV_DB_URL}" -c "SELECT COUNT(*) FROM ${table}" -t`, { encoding: 'utf-8' });
      console.log(`${table}: ${count.trim()} rows`);
    } catch (e) {
      console.log(`${table}: ERROR - table does not exist or no access`);
    }
  }

  // Check search_path
  console.log('');
  console.log('Checking search_path...');
  const searchPath = execSync(`psql "${DEV_DB_URL}" -c "SHOW search_path;" -t`, { encoding: 'utf-8' });
  console.log('search_path:', searchPath.trim());
} catch (e) {
  console.error('Connection failed:', e instanceof Error ? e.message : e);
  process.exit(1);
}
