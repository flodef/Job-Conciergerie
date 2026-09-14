/**
 * Test e2e Phase A — enrollment sécurisé (tokens + devices pending `$`)
 * Usage : bun scripts/test-phaseA.ts   (dev server doit tourner sur :3000)
 *
 * Scénario :
 *   A = appareil connecté existant (seedé avec un vrai id de la DB)
 *   B = nouvel appareil → formulaire → `$B` pending + email → lien token → connecté
 *   C = nouvel appareil → formulaire → `$C` pending → token forgé refusé,
 *       pas d'accès données → approbation via Settings de A → connecté
 *   E = appareil avec id legacy → rotation transparente vers v2_
 */
import { chromium, type BrowserContext, type Page } from 'playwright';
import { hashId, sql } from '../app/db/db';
import { generateSecureId } from '../app/utils/id';
import packageJson from '../package.json';

const BASE = 'http://localhost:3000';
const CHANGELOG_SEED = `
  localStorage.setItem('changelog_seen_version', JSON.stringify(${JSON.stringify(packageJson.version)}));
`;
const EMP = {
  firstName: 'Flojito',
  familyName: 'Stillnet',
  tel: '0620718834',
  email: 'flodef@free.fr',
  zoneSearch: 'Saint-Nic',
};

let failures = 0;
const ok = (cond: boolean, label: string) => {
  console.log(`  ${cond ? '✅' : '❌'} ${label}`);
  if (!cond) failures++;
};
const step = (t: string) => console.log(`\n■ ${t}`);

const getIds = async (): Promise<string[]> => {
  const [r] = await sql`SELECT id FROM employees WHERE first_name=${EMP.firstName} AND family_name=${EMP.familyName}`;
  return (r?.id as string[]) ?? [];
};

// Stored ids are hashed post-migration — dual-match (raw OR sha256) keeps the
// script valid before, during and after the transition.
const hasDevice = (ids: string[], raw: string) => ids.includes(raw) || ids.includes(hashId(raw));
const hasPending = (ids: string[], raw: string) => ids.includes(`$${raw}`) || ids.includes(`$${hashId(raw)}`);

const latestEmailLink = async (): Promise<string | null> => {
  const [r] =
    await sql`SELECT body FROM email_logs WHERE type='newDevice' AND "to"=${EMP.email} ORDER BY sent_at DESC LIMIT 1`;
  return r?.body?.match(/https?:\/\/[^\s"'<>]+\?t=[^\s"'<>]+/)?.[0] ?? null;
};

const seedContext = async (
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  deviceId: string,
  userType = 'employee',
): Promise<BrowserContext> => {
  const ctx = await browser.newContext();
  await ctx.addCookies([
    { name: 'user_id', value: deviceId, url: BASE },
    { name: 'user_type', value: userType, url: BASE },
  ]);
  await ctx.addInitScript(
    ([id, type, seed]) => {
      localStorage.setItem('user_id', JSON.stringify(id));
      localStorage.setItem('user_type', JSON.stringify(type));
      eval(seed);
    },
    [deviceId, userType, CHANGELOG_SEED],
  );
  return ctx;
};

const freshContext = async (browser: Awaited<ReturnType<typeof chromium.launch>>) => {
  const ctx = await browser.newContext();
  await ctx.addInitScript(seed => eval(seed), CHANGELOG_SEED);
  return ctx;
};

const getDeviceId = async (page: Page): Promise<string> =>
  JSON.parse((await page.evaluate(() => localStorage.getItem('user_id'))) ?? '""');

const fillEmployeeForm = async (page: Page) => {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.locator('button:has-text("Prestataire")').first().click();
  await page.locator('#firstName').fill(EMP.firstName);
  await page.locator('#familyName').fill(EMP.familyName);
  await page.locator('#tel').fill(EMP.tel);
  await page.locator('#email').fill(EMP.email);
  // Combobox zone : clic pour ouvrir puis première option (le matching se fait sur tel/email)
  await page.locator('#geographic-zone').click();
  await page.locator('[role="listbox"] [role="option"]').first().click();
  // Select conciergerie : clic puis première option
  await page.locator('#conciergerie').click();
  await page.locator('#conciergerie-options [role="option"]').first().click();
  await page.locator('button[type="submit"], button:has-text("Valider")').last().click();
};

const browser = await chromium.launch();
const originalIds = await getIds();
console.log(`Employé test : ${EMP.firstName} ${EMP.familyName} — devices: ${originalIds.join(', ')}`);

// A = device frais ajouté en DB (hashé — post-migration les ids stockés ne sont
// plus des credentials utilisables ; le seed pioche un vrai id brut v2_).
const idA = generateSecureId();
await sql`UPDATE employees SET id = array_append(id, ${hashId(idA)}) WHERE first_name=${EMP.firstName} AND family_name=${EMP.familyName}`;

try {
  // ── Phase A : appareil connecté existant ──────────────────────────
  step('A. Appareil connecté (A) accède à /missions');
  const ctxA = await seedContext(browser, idA);
  const pageA = await ctxA.newPage();
  await pageA.goto(`${BASE}/missions`, { waitUntil: 'networkidle' });
  ok(pageA.url().startsWith(`${BASE}/missions`), 'A reste sur /missions');
  const h1A = await pageA.locator('h1, h2').allTextContents();
  ok(!h1A.some(t => /incorrect|non trouvée/i.test(t)), 'A : pas de page d’erreur');

  // ── Phase B : nouvel appareil → pending + email ───────────────────
  step('B. Nouvel appareil (B) soumet le formulaire → pending `$` + email');
  const ctxB = await freshContext(browser);
  const pageB = await ctxB.newPage();
  await fillEmployeeForm(pageB);
  await pageB.waitForURL(`${BASE}/waiting`, { timeout: 30000 });
  const idB = await getDeviceId(pageB);
  console.log(`  device B = ${idB}`);
  ok(idB.startsWith('v2_'), 'id B au format v2_');
  let ids = await getIds();
  ok(hasPending(ids, idB), `DB contient $${idB} (pending)`);
  ok(!hasDevice(ids, idB), 'B pas encore connecté');
  const link = await latestEmailLink();
  ok(!!link?.includes(idB), `email_logs contient le lien tokenisé pour B`);
  console.log(`  lien : ${link}`);

  // ── Phase C : nouvel appareil → pending → protections ────────────
  step('C. Nouvel appareil (C) → pending → token forgé refusé → pas d’accès données');
  const ctxC = await freshContext(browser);
  const pageC = await ctxC.newPage();
  await fillEmployeeForm(pageC);
  await pageC.waitForURL(`${BASE}/waiting`, { timeout: 30000 });
  const idC = await getDeviceId(pageC);
  console.log(`  device C = ${idC}`);
  ids = await getIds();
  ok(hasPending(ids, idC), `DB contient $${idC} (pending)`);

  // C1 : token forgé → refusé, reste pending
  await pageC.goto(`${BASE}/${idC}?t=9999999999.deadbeef`, { waitUntil: 'networkidle' });
  ids = await getIds();
  ok(hasPending(ids, idC) && !hasDevice(ids, idC), 'token forgé → C reste pending');
  // token forgé = traité comme « pas de token » → /waiting (pas d'accès), jamais /missions
  ok(!pageC.url().includes('/missions'), `token forgé → pas d'accès (url=${pageC.url()})`);

  // C2 : pas de token → reste pending (waiting)
  await pageC.goto(`${BASE}/${idC}`, { waitUntil: 'networkidle' });
  ids = await getIds();
  ok(hasPending(ids, idC) && !hasDevice(ids, idC), 'sans token → C reste pending');

  // C3 : pending ne charge pas les données protégées
  await pageC.goto(`${BASE}/missions`, { waitUntil: 'networkidle' });
  await pageC.waitForTimeout(2500);
  const missionsText = await pageC.locator('body').innerText();
  ok(
    /Erreur lors du chargement|Aucune mission/i.test(missionsText) || !pageC.url().includes('/missions'),
    'C pending → missions non chargées (guard serveur)',
  );

  // ── Phase D : lien token → B connecté ─────────────────────────────
  step('D. B ouvre le lien email (token valide) → connecté immédiatement');
  await pageB.goto(link!, { waitUntil: 'networkidle' });
  await pageB.waitForTimeout(2000);
  ids = await getIds();
  ok(hasDevice(ids, idB) && !hasPending(ids, idB), 'B connecté (plus de `$`)');
  ok(pageB.url().includes('/missions'), `B redirigé vers /missions (url=${pageB.url()})`);

  // ── Phase E : A approuve C via Settings ───────────────────────────
  step('E. A approuve C depuis Paramètres > Appareils');
  await pageA.goto(`${BASE}/settings`, { waitUntil: 'networkidle' });
  await pageA.locator('text=Appareils connectés').first().click();
  await pageA.waitForTimeout(1000);
  const valider = pageA.locator('button[title="Valider"]');
  ok((await valider.count()) > 0, 'bouton « Valider » visible pour le device pending');
  await valider.first().click();
  await pageA.waitForTimeout(2000);
  ids = await getIds();
  ok(hasDevice(ids, idC) && !hasPending(ids, idC), 'C approuvé → connecté dans la DB');

  // C après approbation : reload waiting → accès
  await pageC.goto(`${BASE}/waiting`, { waitUntil: 'networkidle' });
  await pageC.waitForTimeout(2000);
  await pageC.goto(`${BASE}/missions`, { waitUntil: 'networkidle' });
  await pageC.waitForTimeout(2000);
  const missionsAfter = await pageC.locator('body').innerText();
  ok(
    pageC.url().includes('/missions') && !/Erreur lors du chargement/i.test(missionsAfter),
    'C approuvé → /missions accessible',
  );

  // ── Phase F : rotation transparente d'un id legacy ────────────────
  // Post-migration il n'y a plus d'ids legacy en DB — on en seede un faux sur
  // l'employé de test (le cleanup restaure le tableau d'origine).
  step('F. Id legacy → rotation transparente v2_');
  const legacyId = 'legacy_seed_' + Math.random().toString(36).slice(2, 10);
  await sql`UPDATE employees SET id = array_append(id, ${legacyId}) WHERE first_name=${EMP.firstName} AND family_name=${EMP.familyName}`;
  const legacyRow = { first_name: EMP.firstName, family_name: EMP.familyName };
  console.log(`  legacy seedé : ${legacyId}`);
  const ctxE = await seedContext(browser, legacyId);
  const pageE = await ctxE.newPage();
  await pageE.goto(`${BASE}/missions`, { waitUntil: 'networkidle' });
  await pageE.waitForTimeout(3000);
  const cookies = await ctxE.cookies(BASE);
  const newCookie = cookies.find(c => c.name === 'user_id')?.value ?? '';
  ok(newCookie.startsWith('v2_'), `cookie user_id rotaté → ${newCookie}`);
  const [after] =
    await sql`SELECT id FROM employees WHERE first_name=${legacyRow.first_name} AND family_name=${legacyRow.family_name}`;
  const afterIds = after.id as string[];
  ok(hasDevice(afterIds, newCookie) && !hasDevice(afterIds, legacyId), 'DB : legacy remplacé par v2_ (hashé)');
  ok(pageE.url().includes('/missions'), 'rotation sans déconnexion');
  // rollback pour pouvoir rejouer le test (le v2_ stocké peut être hashé)
  await sql`UPDATE employees SET id=${afterIds.map(i => (hasDevice([i], newCookie) ? legacyId : i))} WHERE first_name=${legacyRow.first_name} AND family_name=${legacyRow.family_name}`;

  // ── Phase G : lien token sur un AUTRE appareil → refusé ───────────
  step('G. Lien de B ouvert dans un contexte tiers → refusé');
  const ctxG = await freshContext(browser);
  const pageG = await ctxG.newPage();
  await pageG.goto(BASE, { waitUntil: 'domcontentloaded' }); // génère un user_id frais
  await pageG.waitForTimeout(1500);
  await pageG.goto(link!, { waitUntil: 'networkidle' });
  ok(!pageG.url().includes('/missions'), `lien lié à B refusé sur autre appareil (url=${pageG.url()})`);
  await ctxG.close();
} finally {
  // Cleanup : restaurer le tableau d'ids d'origine
  await sql`UPDATE employees SET id=${originalIds} WHERE first_name=${EMP.firstName} AND family_name=${EMP.familyName}`;
  await browser.close();
  await sql.end();
}

console.log(`\n${failures === 0 ? '🎉 Tous les tests passent' : `⚠️  ${failures} échec(s)`}`);
process.exit(failures === 0 ? 0 : 1);
