/**
 * demoSeed.ts — seeds/resets the dedicated demo database (Phase E).
 *
 * Shared by scripts/seed-demo.ts (CLI) and app/api/demo/reset (cron/lazy
 * reseed). The URL is always passed explicitly — never read from request
 * context — so a reset triggered on any host can only touch the demo DB.
 *
 * The reset is a full wipe: DROP SCHEMA public CASCADE + migrations/schema.sql
 * + seed rows. Demo data is disposable by design.
 */

import { DEMO_DEVICE_ID } from '@/app/utils/demo';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import postgres from 'postgres';

/** Reseed when the demo data is older than this (lazy check in /api/demo/reset). */
export const DEMO_STALE_AFTER_MS = 12 * 60 * 60 * 1000;

// Local copy of db.ts's hashId — the seed never imports the pooled sql.
const hashId = (id: string) => createHash('sha256').update(id).digest('hex');

export interface SeedSummary {
  clients: number;
  conciergeries: number;
  employees: number;
  homes: number;
  missions: number;
  missionReports: number;
  reviews: number;
}

/**
 * Age of the current demo seed (ms), or null when the DB was never seeded.
 * Used by the lazy reseed: a demo DB older than DEMO_STALE_AFTER_MS gets wiped.
 */
export async function demoSeedAgeMs(url: string): Promise<number | null> {
  const sql = postgres(url, { prepare: false, max: 1, connect_timeout: 10 });
  try {
    const rows = await sql`
      SELECT created_at FROM public.clients WHERE is_admin = true ORDER BY created_at LIMIT 1
    `.catch(() => []);
    if (!rows.length) return null;
    return Date.now() - new Date(rows[0].created_at as string).getTime();
  } catch {
    return null; // fresh project — no schema yet
  } finally {
    await sql.end();
  }
}

// ── Seed content — Brittany-flavoured, mirrors the real tenants' shape ──

const DEMO_CLIENT_NAME = 'Démo';
const ADMIN_CLIENT_NAME = 'Job Conciergerie — admin';
const ADMIN_ROW_NAME = 'Admin';

const CONCIERGERIES = [
  { name: 'Conciergerie Azur', email: 'demo+azur@job-conciergerie.fr', tel: '0600000001', color: 'Bleu' },
  { name: 'Conciergerie du Léon', email: 'demo+leon@job-conciergerie.fr', tel: '0600000002', color: 'Vert' },
] as const;

const EMPLOYEES = [
  { first: 'Léa', family: 'Morvan', zone: 'Crozon', conciergerie: 'Conciergerie Azur' },
  { first: 'Yann', family: 'Le Goff', zone: 'Camaret-sur-Mer', conciergerie: 'Conciergerie Azur' },
  { first: 'Marie', family: 'Riou', zone: 'Morgat', conciergerie: 'Conciergerie Azur' },
  { first: 'Tom', family: 'Kerbrat', zone: 'Douarnenez', conciergerie: 'Conciergerie du Léon' },
  { first: 'Anna', family: 'Le Bras', zone: 'Telgruc-sur-Mer', conciergerie: 'Conciergerie du Léon' },
  { first: 'Nolwenn', family: 'Poder', zone: 'Landévennec', conciergerie: 'Conciergerie du Léon' },
] as const;

const OBJECTIVES = [
  '- mettre une grande et une petite serviette par personne enroulées sur chaque lit.',
  '- mettre une petite serviette ou un essuie-main par point d’eau.',
  '- mettre 2 torchons vaisselle enroulés dans la cuisine avec une dosette de lave-vaisselle.',
  '- remettre des sacs poubelles dans chaque poubelle de la maison.',
  '- mettre un rouleau de papier toilette neuf.',
];

// Image paths reuse real objects from the shared Supabase storage bucket —
// the demo app builds URLs against NEXT_PUBLIC_SUPABASE_URL (prod project),
// so these render without duplicating any asset.
const HOMES = [
  {
    id: 'demo-home-01',
    title: 'Villa Azur',
    zone: 'Crozon',
    img: 'CMD Breizh/TY PENN AR BED 0.jpeg',
    conciergerie: 'Conciergerie Azur',
    clean: 3,
    garden: 0.5,
    travellers: 6,
    duo: false,
  },
  {
    id: 'demo-home-02',
    title: 'Ty Coz',
    zone: 'Morgat',
    img: 'CMD Breizh/APPARTEMENT COSY 0.jpeg',
    conciergerie: 'Conciergerie Azur',
    clean: 2,
    garden: 0,
    travellers: 4,
    duo: false,
  },
  {
    id: 'demo-home-03',
    title: 'Les Coquillettes',
    zone: 'Saint-Nic / Pentrez',
    img: 'CMD Breizh/LES COQUILLETTES 0.jpeg',
    conciergerie: 'Conciergerie Azur',
    clean: 2.5,
    garden: 1,
    travellers: 5,
    duo: false,
  },
  {
    id: 'demo-home-04',
    title: 'Studio Valentine',
    zone: 'Landévennec',
    img: 'MENTHEREGLISSE/Studio Valentine 0.jpeg',
    conciergerie: 'Conciergerie Azur',
    clean: 1.5,
    garden: 0,
    travellers: 2,
    duo: false,
  },
  {
    id: 'demo-home-05',
    title: 'Kerys',
    zone: 'Telgruc-sur-Mer',
    img: 'MENTHEREGLISSE/KERYS 0.jpeg',
    conciergerie: 'Conciergerie Azur',
    clean: 3,
    garden: 1,
    travellers: 8,
    duo: true,
  },
  {
    id: 'demo-home-06',
    title: 'Duplex Annaelle',
    zone: 'Landévennec',
    img: 'MENTHEREGLISSE/Duplex ANNAELLE 0.jpg',
    conciergerie: 'Conciergerie du Léon',
    clean: 2,
    garden: 0,
    travellers: 4,
    duo: false,
  },
  {
    id: 'demo-home-07',
    title: 'La Petite Maison de la Mer',
    zone: 'Plonevez-Porzay',
    img: 'Calluna/LA PETITE MAISON DE LA MER 0.jpeg',
    conciergerie: 'Conciergerie du Léon',
    clean: 2.5,
    garden: 0.5,
    travellers: 4,
    duo: false,
  },
  {
    id: 'demo-home-08',
    title: 'Les Mouettes Rieuses',
    zone: 'Telgruc-sur-Mer',
    img: 'MENTHEREGLISSE/les mouettes rieuses 0.jpeg',
    conciergerie: 'Conciergerie du Léon',
    clean: 3.5,
    garden: 1,
    travellers: 8,
    duo: true,
  },
  {
    id: 'demo-home-09',
    title: 'Ti Ar Mor',
    zone: 'Camaret-sur-Mer',
    img: 'CMD Breizh/TY PENN AR BED 1.jpeg',
    conciergerie: 'Conciergerie du Léon',
    clean: 2,
    garden: 0,
    travellers: 3,
    duo: false,
  },
  {
    id: 'demo-home-10',
    title: 'Ker Anna',
    zone: 'Roscanvel',
    img: 'MENTHEREGLISSE/KERYS 1.jpeg',
    conciergerie: 'Conciergerie du Léon',
    clean: 2.5,
    garden: 0.5,
    travellers: 6,
    duo: false,
  },
] as const;

const emp = (i: number) => `${EMPLOYEES[i].first} ${EMPLOYEES[i].family}`;

// offsets are days relative to seed time; hour is the mission start hour
const MISSIONS: {
  home: number;
  day: number;
  hour: number;
  hours: number;
  tasks: string[];
  status: 'accepted' | 'started' | 'completed' | null;
  e1?: number;
  e2?: number;
  travellers?: number;
  comment?: string;
}[] = [
  // Past — completed
  { home: 0, day: -6, hour: 10, hours: 3, tasks: ['Ménage', 'Départ'], status: 'completed', e1: 0 },
  { home: 2, day: -5, hour: 9, hours: 2.5, tasks: ['Ménage'], status: 'completed', e1: 1 },
  { home: 5, day: -4, hour: 11, hours: 2, tasks: ['Ménage'], status: 'completed', e1: 3 },
  { home: 7, day: -3, hour: 10, hours: 3.5, tasks: ['Ménage', 'Jardinage'], status: 'completed', e1: 4, e2: 5 },
  { home: 1, day: -2, hour: 14, hours: 2, tasks: ['Ménage'], status: 'completed', e1: 0 },
  // Today — in flight
  { home: 3, day: 0, hour: 9, hours: 1.5, tasks: ['Ménage'], status: 'started', e1: 1 },
  { home: 6, day: 0, hour: 11, hours: 2.5, tasks: ['Ménage', 'Départ'], status: 'accepted', e1: 3 },
  {
    home: 4,
    day: 0,
    hour: 15,
    hours: 3,
    tasks: ['Ménage', 'Jardinage'],
    status: 'accepted',
    e1: 2,
    e2: 5,
    comment: 'Arrivée locataires à 18h — cadeau de bienvenue sur la table.',
  },
  // Future — accepted
  { home: 0, day: 1, hour: 10, hours: 3, tasks: ['Ménage'], status: 'accepted', e1: 0 },
  { home: 8, day: 1, hour: 14, hours: 2, tasks: ['Ménage'], status: 'accepted', e1: 4 },
  { home: 9, day: 2, hour: 10, hours: 2.5, tasks: ['Ménage', 'Départ'], status: 'accepted', e1: 5, travellers: 4 },
  { home: 5, day: 3, hour: 10, hours: 2, tasks: ['Ménage'], status: 'accepted', e1: 3 },
  // Future — available (unclaimed)
  { home: 1, day: 2, hour: 10, hours: 2, tasks: ['Ménage'], status: null },
  { home: 2, day: 3, hour: 9, hours: 2.5, tasks: ['Ménage', 'Jardinage'], status: null },
  { home: 7, day: 4, hour: 10, hours: 3.5, tasks: ['Ménage'], status: null },
  { home: 3, day: 5, hour: 11, hours: 1.5, tasks: ['Ménage'], status: null },
  {
    home: 6,
    day: 6,
    hour: 10,
    hours: 2.5,
    tasks: ['Ménage', 'Départ'],
    status: null,
    comment: 'Départ dimanche — prévoir le kit complet.',
  },
  { home: 9, day: 7, hour: 10, hours: 2.5, tasks: ['Ménage'], status: null },
];

/**
 * Reset + seed the demo database. Refuses to run against the production
 * project (guard on PROD_SUPABASE_PROJECT_ID in the URL).
 */
export async function seedDemoDatabase(url: string): Promise<SeedSummary> {
  // Never seed the production database: refuse when the target IS DATABASE_URL
  // or sits in the production Supabase project (PROD_SUPABASE_PROJECT_ID may
  // be unset on Vercel — the URL equality check is the reliable guard there).
  if (url === process.env.DATABASE_URL) throw new Error('Refusing to seed: the URL is DATABASE_URL');
  const prodRef = process.env.PROD_SUPABASE_PROJECT_ID;
  if (prodRef && url.includes(prodRef)) throw new Error('Refusing to seed: the URL points at the production project');

  const sql = postgres(url, { prepare: false, max: 1, connect_timeout: 10 });
  try {
    // Full wipe — the demo schema is recreated from the committed dump.
    await sql.unsafe('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    const schema = readFileSync(join(process.cwd(), 'migrations', 'schema.sql'), 'utf8');
    await sql.unsafe(schema);
    // The dump sets search_path to '' (pg_dump guard) — restore it for this session.
    await sql.unsafe(`SET search_path TO public, extensions`);

    // 1. Clients: the admin tenant (demo login anchor) + the visible demo tenant
    const [adminClient] = await sql`
      INSERT INTO clients (name, plan, is_admin) VALUES (${ADMIN_CLIENT_NAME}, 'privilege', true) RETURNING id`;
    const [demoClient] = await sql`
      INSERT INTO clients (name, plan, is_admin) VALUES (${DEMO_CLIENT_NAME}, 'pro', false) RETURNING id`;

    // 2. Admin conciergerie holding the public demo credential (hash only)
    await sql`
      INSERT INTO conciergeries (id, name, email, tel, color_name, plan, client_id)
      VALUES (ARRAY[${hashId(DEMO_DEVICE_ID)}]::text[], ${ADMIN_ROW_NAME}, 'demo@job-conciergerie.fr', '0600000000', 'Gris', 'privilege', ${adminClient.id})`;
    // The public credential never expires
    await sql`INSERT INTO device_seen (device_hash, last_seen) VALUES (${hashId(DEMO_DEVICE_ID)}, now())`;

    // 3. Demo conciergeries
    for (const c of CONCIERGERIES)
      await sql`
        INSERT INTO conciergeries (id, name, email, tel, color_name, plan, client_id)
        VALUES (ARRAY[]::text[], ${c.name}, ${c.email}, ${c.tel}, ${c.color}, 'pro', ${demoClient.id})`;

    // 4. Employees — tel/email have UNIQUE constraints, so each gets its own
    for (const [i, e] of EMPLOYEES.entries())
      await sql`
        INSERT INTO employees (id, first_name, family_name, tel, email, geographic_zone, message, conciergerie_name, status, client_id)
        VALUES (ARRAY[]::text[], ${e.first}, ${e.family}, ${'060000001' + i}, ${e.first.toLowerCase() + '.' + e.family.toLowerCase().replace(/ /g, '') + '@demo.job-conciergerie.fr'}, ${e.zone}, 'Prestataire démo', ${e.conciergerie}, 'accepted', ${demoClient.id})`;

    // 5. Homes
    for (const h of HOMES)
      await sql`
        INSERT INTO homes (id, title, description, objectives, images, geographic_zone, hours_of_cleaning, hours_of_gardening, conciergerie_name, allow_duo, max_travellers, client_id)
        VALUES (${h.id}, ${h.title}, ${'Logement de démonstration — ' + h.zone}, ${OBJECTIVES}, ${[h.img]}, ${h.zone}, ${h.clean}, ${h.garden}, ${h.conciergerie}, ${h.duo}, ${h.travellers}, ${demoClient.id})`;

    // 6. Missions — mix of past/completed, in-flight today, upcoming, available
    for (const [i, m] of MISSIONS.entries()) {
      const h = HOMES[m.home];
      const start = new Date(Date.now() + m.day * 86400000);
      start.setHours(m.hour, 0, 0, 0);
      const end = new Date(start.getTime() + m.hours * 3600000);
      await sql`
        INSERT INTO missions (id, home_id, tasks, start_date_time, end_date_time, modified_date, conciergerie_name, hours, employee_id, employee_id_2, status, allow_duo, travellers, conciergerie_comment, client_id)
        VALUES (${'demo-mission-' + String(i + 1).padStart(2, '0')}, ${h.id}, ${m.tasks},
                ${start}, ${end}, now(),
                ${h.conciergerie}, ${m.hours}, ${m.e1 !== undefined ? emp(m.e1) : null},
                ${m.e2 !== undefined ? emp(m.e2) : null}, ${m.status}, ${m.e2 !== undefined},
                ${m.travellers ?? 1}, ${m.comment ?? null}, ${demoClient.id})`;
    }

    // 7. A couple of mission reports on the completed missions
    const reports = MISSIONS.map((m, i) => ({ m, i }))
      .filter(({ m }) => m.status === 'completed')
      .slice(0, 3);
    for (const { m, i } of reports)
      await sql`
        INSERT INTO mission_reports (id, mission_id, employee_id, content, images, client_id)
        VALUES (${'demo-report-' + i}, ${'demo-mission-' + String(i + 1).padStart(2, '0')}, ${m.e1 !== undefined ? emp(m.e1) : ''},
                'Ménage terminé, tout est en ordre. Photos envoyées.', ${[] as string[]}, ${demoClient.id})`;

    // 8. A couple of reviews to showcase the feature
    await sql`
      INSERT INTO reviews (user_type, row_key, rating, comment, is_public)
      VALUES ('conciergerie', 'Conciergerie Azur', 5, 'Application simple et efficace, nos prestataires adorent.', true),
             ('employee', ${emp(0)}, 4, 'Très pratique pour suivre mes missions au quotidien.', true)`;

    return {
      clients: 2,
      conciergeries: CONCIERGERIES.length + 1,
      employees: EMPLOYEES.length,
      homes: HOMES.length,
      missions: MISSIONS.length,
      missionReports: reports.length,
      reviews: 2,
    };
  } finally {
    await sql.end();
  }
}
