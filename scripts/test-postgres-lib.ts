#!/usr/bin/env bun
/**
 * test-postgres-lib.ts
 * Test database connection using the same postgres library as the app
 */

import { config } from 'dotenv';
import postgres from 'postgres';

// Load environment variables
config({ path: '.env.local' });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

console.log('Testing connection with postgres library...');
console.log('DATABASE_URL:', databaseUrl.replace(/@.*$/, '@***'));
console.log('');

try {
  const sql = postgres(databaseUrl, {
    prepare: false,
    max: 2,
    idle_timeout: 10,
    connect_timeout: 5,
  });

  console.log('Testing simple query...');
  const result = await sql`SELECT version()`;
  console.log('✓ Connected successfully');
  console.log('PostgreSQL version:', result[0].version);
  console.log('');

  console.log('Listing tables...');
  const tables = await sql`
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    ORDER BY tablename
  `;
  console.log('Tables:', tables.map(t => t.tablename).join(', '));
  console.log('');

  console.log('Counting rows in key tables...');
  const keyTables = ['conciergeries', 'employees', 'homes', 'missions'];
  for (const table of keyTables) {
    try {
      const count = await sql`SELECT COUNT(*) FROM ${sql(table)}`;
      console.log(`${table}: ${count[0].count} rows`);
    } catch (e) {
      console.log(`${table}: ERROR -`, e instanceof Error ? e.message : e);
    }
  }

  await sql.end();
  console.log('');
  console.log('✓ All tests passed');
} catch (e) {
  console.error('Connection failed:', e instanceof Error ? e.message : e);
  console.error('Full error:', e);
  process.exit(1);
}
