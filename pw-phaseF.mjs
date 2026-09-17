// Phase F manual checklist — demo.localhost end-to-end
import { chromium } from 'playwright';

const BASE = 'http://demo.localhost:3000';
const DEMO_ID = 'v2_de01de01de01de01de01de01de01de01';
const SHOT = n => `/tmp/F-${n}.png`;
const ok = m => console.log(`  ✓ ${m}`);
const bad = m => console.log(`  ✗ ${m}`);

const dispatchClick = async (page, loc) =>
  loc.evaluate(el => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));

// All nav pages stay mounted (opacity toggled) — the ACTIVE wrapper has inline opacity:1
const clickFab = async page => {
  const active = page.locator('div[style*="opacity: 1"] button.fixed.bottom-20.w-14').first();
  if (await active.count()) return dispatchClick(page, active);
  await dispatchClick(page, page.locator('button.fixed.bottom-20.w-14').first());
};

// Navigate like a real user via the bottom nav — currentPage comes from menuContext,
// a raw goto() changes the URL but the active page lags behind.
const navTo = async (page, label, marker) => {
  await page.waitForSelector('nav.fixed.bottom-0', { timeout: 20000 });
  await dispatchClick(page, page.locator('nav.fixed.bottom-0 button', { hasText: label }).first());
  if (marker) {
    await page
      .waitForFunction(
        m => [...document.querySelectorAll('div[style*="opacity: 1"]')].some(d => d.innerText.includes(m)),
        marker,
        { timeout: 15000 },
      )
      .catch(() => console.log('  navTo marker timeout:', marker));
  }
  await page.waitForTimeout(1200);
};

// Click a text element inside the ACTIVE page wrapper (inactive pages stay mounted at opacity:0)
const clickInActive = async (page, text) => {
  const el = page.locator('div[style*="opacity: 1"]').getByText(text, { exact: false }).first();
  await dispatchClick(page, el);
};

const closeTopModal = async page => {
  // Close whatever z-50 overlay is on top (mission details, info modal…)
  for (let i = 0; i < 3; i++) {
    const overlay = page.locator('div.fixed.inset-0.z-50').last();
    if (!(await overlay.isVisible({ timeout: 800 }).catch(() => false))) return;
    const close = overlay.locator('button[aria-label="Fermer"]').first();
    if (await close.isVisible().catch(() => false)) await dispatchClick(page, close);
    else await page.keyboard.press('Escape');
    await page.waitForTimeout(700);
  }
};

const closeChangelog = async page => {
  for (let i = 0; i < 5; i++) {
    const modal = page.locator('div.fixed.inset-0:has-text("Nouveautés")').first();
    if (!(await modal.isVisible({ timeout: 800 }).catch(() => false))) return;
    const close = modal.locator('button[aria-label="Fermer"]').first();
    if (await close.isVisible().catch(() => false)) await dispatchClick(page, close);
    else await page.keyboard.press('Escape');
    await page.waitForTimeout(700);
  }
};

const impersonate = async (page, optionText) => {
  await navTo(page, 'Paramètres', 'Administration');
  await closeChangelog(page);
  await page
    .getByText('Administration', { exact: true })
    .first()
    .evaluate(e => e.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  await page.waitForTimeout(500);
  await page.locator('#impersonate-target').click();
  await page.waitForTimeout(400);
  await page.getByRole('option', { name: optionText }).first().click();
  await page.waitForTimeout(300);
  await page
    .getByRole('button', { name: /Voir en tant que/ })
    .first()
    .click();
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForTimeout(4000);
};

const stopImpersonation = async page => {
  const quit = page.getByRole('button', { name: /Quitter/i }).first();
  if (await quit.isVisible({ timeout: 2000 }).catch(() => false)) {
    await dispatchClick(page, quit);
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await page.waitForTimeout(3000);
  }
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
page.on('console', m => {
  if (m.type() === 'error') console.log('  [console.error]', m.text().slice(0, 160));
});
page.on('response', r => {
  if (r.status() >= 400) console.log('  [http', r.status() + ']', r.url().slice(0, 140));
});

// ---------- 1. Login ----------
console.log('=== 1. Demo login ===');
await page.goto(`${BASE}/${DEMO_ID}`, { waitUntil: 'domcontentloaded' });
await page.waitForURL(u => !u.pathname.includes('v2_'), { timeout: 60000 });
await page.waitForTimeout(2500);
console.log('  url:', page.url());
// Banner mounts post-hydration — wait for it instead of a fixed delay
const demoBanner = await page
  .getByText(/Mode démo/)
  .first()
  .isVisible({ timeout: 15000 })
  .catch(() => false);
demoBanner ? ok('demo banner visible') : bad('demo banner MISSING');
await page.screenshot({ path: SHOT('01-login') });
await closeChangelog(page);

// ---------- 2. Impersonate Conciergerie Azur ----------
console.log('=== 2. Impersonate Conciergerie Azur ===');
await impersonate(page, 'Conciergerie — Conciergerie Azur');
const impBanner = await page
  .getByText(/Vue en tant que/i)
  .first()
  .isVisible()
  .catch(() => false);
impBanner ? ok('impersonation banner visible') : bad('impersonation banner MISSING');
await page.screenshot({ path: SHOT('02-impersonate') });

// ---------- 3. Create a home (duo-enabled) ----------
console.log('=== 3. Create a home (allowDuo) ===');
const HOME = `Maison PW ${Date.now() % 100000}`;
await navTo(page, 'Biens', 'Biens');
await closeChangelog(page);
const emptyHomes = page.getByText('Aucun bien', { exact: false }).first();
if (await emptyHomes.isVisible({ timeout: 1200 }).catch(() => false)) {
  await emptyHomes.click();
} else {
  await clickFab(page);
}
await page.waitForTimeout(1000);
await page.screenshot({ path: SHOT('03a-homes-fab') });
const probe = await page.evaluate(() => {
  const b = document.querySelector('button.fixed.bottom-20.w-14');
  if (!b) return 'no fab';
  const r = b.getBoundingClientRect();
  const el = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
  return 'topmost: ' + (el ? el.tagName + ' ' + (el.className || '').toString().slice(0, 90) : 'null');
});
console.log('  probe:', probe);
await page.waitForSelector('#title', { timeout: 8000 });
await page.locator('input[type=file]').first().setInputFiles('/tmp/test-photo.png');
await page.waitForTimeout(800);
await page.locator('#title').fill(HOME);
await page.locator('#geographic-zone').click();
await page.waitForTimeout(400);
await page.getByRole('option').first().click();
await page.locator('#description').fill('Bien de test créé pendant la checklist Phase F.');
await page.locator('#hours-of-cleaning').click();
await page.getByRole('option', { name: '2' }).first().click();
await dispatchClick(page, page.locator('#allow-duo'));
await page.locator('textarea[placeholder^="Description"]').first().fill('Vérifier le lave-vaisselle avant le départ');
await page.waitForTimeout(300);
await dispatchClick(page, page.getByRole('button', { name: 'Ajouter', exact: true }).last());
await page.waitForTimeout(2500);
const homeVisible = await page
  .getByText(HOME)
  .first()
  .isVisible()
  .catch(() => false);
homeVisible ? ok(`home "${HOME}" created`) : bad('home NOT in list');
await page.screenshot({ path: SHOT('03-home') });

// ---------- 4. Create a mission starting soon, ends +4h ----------
console.log('=== 4. Create a mission ===');
const now = new Date();
const start = new Date(now.getTime() + 2 * 60000);
const end = new Date(now.getTime() + 4 * 3600000);
const fmt = d =>
  `${String(d.getDate()).padStart(2, '0')}${String(d.getMonth() + 1).padStart(2, '0')}${d.getFullYear()}${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
await navTo(page, 'Missions', 'mission');
await closeChangelog(page);
// close any stale modal left from the previous page
const staleCancel = page.getByRole('button', { name: 'Annuler', exact: true }).last();
if (await staleCancel.isVisible().catch(() => false)) {
  await dispatchClick(page, staleCancel);
  await page.waitForTimeout(800);
}
await clickFab(page);
await page.waitForTimeout(1500);
await page.screenshot({ path: SHOT('04a-after-fab') });
if (
  !(await page
    .locator('#home-select')
    .isVisible()
    .catch(() => false))
) {
  console.log(
    '  no-home modal:',
    await page
      .getByText('Aucun bien disponible')
      .first()
      .isVisible()
      .catch(() => false),
  );
  bad('mission form did not open');
  await browser.close();
  process.exit(1);
}
await page.locator('#home-select').click();
await page.waitForTimeout(400);
await page.getByRole('option', { name: HOME }).first().click();
await page.getByRole('button', { name: 'Ménage', exact: true }).first().click();
// start-date: click day segment, type DDMMYYYYHHMM
await page.locator('#start-date span').first().click();
await page.waitForTimeout(300);
await page.keyboard.type(fmt(start), { delay: 60 });
await page.keyboard.press('Enter');
await page.waitForTimeout(300);
await page.locator('#end-date span').first().click();
await page.waitForTimeout(300);
await page.keyboard.type(fmt(end), { delay: 60 });
await page.keyboard.press('Enter');
await page.waitForTimeout(400);
await page.screenshot({ path: SHOT('04-mission-form') });
await dispatchClick(page, page.getByRole('button', { name: 'Ajouter', exact: true }).last());
await page.waitForTimeout(2500);
const missionVisible = await page
  .getByText(HOME)
  .first()
  .isVisible()
  .catch(() => false);
missionVisible ? ok('mission created & listed') : bad('mission NOT listed');
await page.screenshot({ path: SHOT('05-mission-list') });

// ---------- 5. Impersonate employee Léa Morvan → accept ----------
console.log('=== 5. Employee accepts ===');
await stopImpersonation(page);
await impersonate(page, 'Prestataire — Léa Morvan');
await navTo(page, 'Missions', 'mission');
await closeChangelog(page);
await page.screenshot({ path: SHOT('06-emp-missions') });
const card = page.getByText(HOME).first();
if (await card.isVisible({ timeout: 5000 }).catch(() => false)) {
  await card.click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: SHOT('07-mission-details') });
  const acceptBtn = page.getByRole('button', { name: 'Accepter', exact: true }).first();
  if (await acceptBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await dispatchClick(page, acceptBtn);
    await page.waitForTimeout(1200);
    // AcceptMissionWarning confirmation modal — second 'Accepter' inside the z-50 overlay
    const confirm = page.locator('div.fixed.inset-0.z-50 button:has-text("Accepter")').last();
    if (await confirm.isVisible({ timeout: 2500 }).catch(() => false)) {
      await dispatchClick(page, confirm);
      await page.waitForTimeout(2000);
      ok('mission accepted (warning confirmed)');
    } else ok('accept clicked (no warning)');
    await closeTopModal(page);
    // verify: card should now show 'accepted' — reopen details
    await page.screenshot({ path: SHOT('07b-after-accept') });
  } else bad('no Accepter button');
} else bad('mission card not found for employee');

// Open the mission details modal from the calendar card (retries while contexts refresh)
const openMissionDetails = async page => {
  for (let i = 0; i < 4; i++) {
    try {
      await clickInActive(page, HOME);
      await page.waitForTimeout(1800);
      if (
        await page
          .getByText('Détails de la mission')
          .first()
          .isVisible()
          .catch(() => false)
      )
        return true;
      await closeTopModal(page);
    } catch {}
  }
  return false;
};

// ---------- 6. Start → finish → photo report ----------
console.log('=== 6. Start, finish, report ===');
// wait until start time passes
const waitMs = start.getTime() - Date.now() + 5000;
if (waitMs > 0) {
  console.log(`  waiting ${Math.round(waitMs / 1000)}s for start time…`);
  await page.waitForTimeout(waitMs);
}
await navTo(page, 'Calendrier');
await page.waitForTimeout(2500);
await closeTopModal(page);
await page.screenshot({ path: SHOT('06b-calendar') });
if (!(await openMissionDetails(page))) bad('could not open mission details');
const startBtn = page.getByRole('button', { name: /Démarrer/ }).first();
if (await startBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
  await dispatchClick(page, startBtn);
  await page.waitForTimeout(4000);
  ok('mission started');
  // reopen → Terminer (missions context may need a refresh cycle)
  let finishBtn;
  for (let i = 0; i < 5; i++) {
    await openMissionDetails(page);
    finishBtn = page.getByRole('button', { name: /Terminer/ }).first();
    if (await finishBtn.isVisible({ timeout: 3000 }).catch(() => false)) break;
    await closeTopModal(page);
    await page.waitForTimeout(2000);
    finishBtn = undefined;
  }
  if (finishBtn) {
    await dispatchClick(page, finishBtn);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: SHOT('08-completion') });
    // check all objective checkboxes
    for (const cb of await page.locator('input[id^="objective-"]').all()) {
      if (!(await cb.isChecked())) await dispatchClick(page, cb);
      await page.waitForTimeout(200);
    }
    await dispatchClick(page, page.getByRole('button', { name: 'Confirmer', exact: true }).last());
    await page.waitForTimeout(1200);
    // askReport → Oui, ajouter
    const yesReport = page.getByRole('button', { name: /Oui, ajouter/ }).first();
    if (await yesReport.isVisible({ timeout: 3000 }).catch(() => false)) {
      await dispatchClick(page, yesReport);
      await page.waitForTimeout(1200);
      await page.locator('#report-content').fill('Compte rendu Phase F — test automatisé.');
      await page
        .locator('#report-images')
        .setInputFiles('/tmp/test-photo.png')
        .catch(e => console.log('  img upload err:', e.message.slice(0, 120)));
      await page.waitForTimeout(800);
      await page.screenshot({ path: SHOT('09-report') });
      await dispatchClick(page, page.getByRole('button', { name: 'Envoyer', exact: true }).last());
      await page.waitForTimeout(3000);
      ok('report submitted');
    } else bad('askReport step not shown');
  } else bad('no Terminer button');
} else bad('no Démarrer button');
await page.screenshot({ path: SHOT('10-after-report') });

// ---------- 7. History ----------
console.log('=== 7. History ===');
await navTo(page, 'Historique', 'Historique');
await page.waitForTimeout(1500);
const hist = await page
  .locator('div[style*="opacity: 1"]')
  .getByText(HOME)
  .first()
  .isVisible()
  .catch(() => false);
hist ? ok('mission visible in history') : bad('mission NOT in history');
await page.screenshot({ path: SHOT('11-history') });

// ---------- 8. Back to admin, verify report as conciergerie ----------
console.log('=== 8. Conciergerie views report ===');
await stopImpersonation(page);
await impersonate(page, 'Conciergerie — Conciergerie Azur');
await navTo(page, 'Missions', 'mission');
await page.screenshot({ path: SHOT('12-conc-missions') });
// Conciergerie has no 'Historique' nav and the calendar excludes completed missions —
// open the mission-status filter and select 'Terminée'
const active = page.locator('div[style*="opacity: 1"]');
await dispatchClick(page, active.locator('button:has(.tabler-icon-filter)').first());
await page.waitForTimeout(800);
await dispatchClick(page, page.locator('#mission-status-filter'));
await page.waitForTimeout(800);
// Select options use onMouseDown, not onClick
await page
  .getByRole('option', { name: 'Terminée' })
  .first()
  .evaluate(el => el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })));
await page.waitForTimeout(2000);
const histC = await active
  .getByText(HOME)
  .first()
  .isVisible()
  .catch(() => false);
histC ? ok('mission in conciergerie completed list') : bad('mission NOT in conciergerie completed list');
if (histC) {
  await clickInActive(page, HOME);
  await page.waitForTimeout(1800);
  const reportText = await page
    .getByText(/Compte rendu|Phase F/)
    .first()
    .isVisible()
    .catch(() => false);
  reportText ? ok('report visible to conciergerie') : bad('report NOT visible');
  await page.screenshot({ path: SHOT('13-report-view') });
}

await browser.close();
console.log('=== DONE ===');
