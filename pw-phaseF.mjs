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

// Button inside the TOPMOST fixed overlay (modals stack; hidden ones stay mounted)
const topButton = (page, name) =>
  page.locator('div.fixed.inset-0').last().getByRole('button', { name, exact: true }).last();

// Fail fast if the styled 500 page (or a raw render error) is on screen
const noCrash = async page => {
  const crashed = await page
    .getByText(/emmelée les pinceaux|Home is required/)
    .first()
    .isVisible()
    .catch(() => false);
  if (crashed) {
    bad('500 error page visible!');
    await page.screenshot({ path: SHOT('crash') });
    await browser.close();
    process.exit(1);
  }
};

// Home details → Supprimer → confirmation Supprimer
const deleteHome = async (page, name) => {
  await clickInActive(page, name);
  await page.waitForTimeout(1500);
  await dispatchClick(page, topButton(page, 'Supprimer'));
  await page.waitForTimeout(800);
  await dispatchClick(page, topButton(page, 'Supprimer'));
  await page.waitForTimeout(2000);
};

// Leftover homes from crashed runs break the zero-home regression — purge them
const purgeTestHomes = async page => {
  for (let i = 0; i < 5; i++) {
    const leftover = page
      .locator('div[style*="opacity: 1"]')
      .getByText(/Maison (PW|ER|E2E)/)
      .first();
    if (!(await leftover.isVisible({ timeout: 1500 }).catch(() => false))) return;
    await deleteHome(page, await leftover.innerText());
  }
};

// Settings → "Votre avis" accordion — content mounts lazily after getMyReview resolves
const openReviewSection = async page => {
  await page
    .getByText('Votre avis', { exact: true })
    .first()
    .evaluate(e => e.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  await page.waitForSelector('#review-comment', { timeout: 15000 });
};
const reviewForm = page => page.locator('div.space-y-2', { has: page.locator('#review-comment') }).first();

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
if (demoBanner) ok('demo banner visible');
else bad('demo banner MISSING');
await page.screenshot({ path: SHOT('01-login') });
await closeChangelog(page);

// ---------- 1b. Zero-home regression: mission → add-home → Annuler ----------
// The demo admin has zero homes by seed — the only path to the "Aucun bien
// disponible" branch. Regression: Annuler used to chain into openAddMission
// via onClose, and MissionForm crashed with 'Home is required' (500 page).
console.log('=== 1b. Zero-home: add-mission → add-home → Annuler ===');
await navTo(page, 'Biens', 'Biens');
await purgeTestHomes(page);
await navTo(page, 'Missions', 'ission');
await closeChangelog(page);
await clickFab(page);
await page.waitForTimeout(1200);
const noHomeModal = await page
  .getByText('Aucun bien disponible')
  .first()
  .isVisible()
  .catch(() => false);
if (!noHomeModal) {
  bad('no-home prompt MISSING (admin should have zero homes)');
  await browser.close();
  process.exit(1);
}
ok('"Aucun bien disponible" prompt shown');
await page.screenshot({ path: SHOT('01b-nohome') });
await dispatchClick(page, topButton(page, 'Ajouter un bien'));
await page.waitForSelector('#title', { timeout: 8000 });
ok('HomeForm opened');
await dispatchClick(page, topButton(page, 'Annuler'));
await page.waitForTimeout(1500);
await noCrash(page);
const missionFormOpened = await page
  .locator('#home-select')
  .isVisible()
  .catch(() => false);
if (missionFormOpened) bad('MissionForm opened after Annuler (regression)');
else ok('Annuler closed cleanly — no MissionForm, back on missions');
await page.screenshot({ path: SHOT('01b-after-cancel') });

// ---------- 1c. Success chain: add home → MissionForm opens preselected ----------
console.log('=== 1c. Add home → MissionForm chained ===');
const ADMIN_HOME = `Maison ER ${Date.now() % 100000}`;
await clickFab(page);
await page.waitForTimeout(1200);
await dispatchClick(page, topButton(page, 'Ajouter un bien'));
await page.waitForSelector('#title', { timeout: 8000 });
await page.locator('input[type=file]').first().setInputFiles('/tmp/test-photo.png');
await page.waitForTimeout(800);
await page.locator('#title').fill(ADMIN_HOME);
await page.locator('#geographic-zone').click();
await page.waitForTimeout(400);
await page.getByRole('option').first().click();
await page.locator('#description').fill('Bien temporaire créé par le test E2E.');
await page.locator('#hours-of-cleaning').click();
await page.getByRole('option', { name: '2' }).first().click();
await page.locator('textarea[placeholder^="Description"]').first().fill('Objectif E2E');
await page.waitForTimeout(300);
await dispatchClick(page, topButton(page, 'Ajouter'));
await page.waitForTimeout(2500);
await noCrash(page);
const chained = await page
  .locator('#home-select')
  .isVisible()
  .catch(() => false);
if (!chained) {
  bad('MissionForm did NOT open after home creation');
  await browser.close();
  process.exit(1);
}
ok('MissionForm opened after home creation');
const preselected = await page
  .locator('#home-select')
  .inputValue()
  .catch(() => '');
if (preselected === ADMIN_HOME) ok(`new home preselected ("${preselected}")`);
else bad(`preselection: "${preselected}"`);
await dispatchClick(page, topButton(page, 'Annuler'));
await page.waitForTimeout(800);
const confirmClose = topButton(page, 'Fermer'); // unsaved-changes modal, if shown
if (await confirmClose.isVisible().catch(() => false)) await dispatchClick(page, confirmClose);
await page.waitForTimeout(1000);
await page.screenshot({ path: SHOT('01c-chained') });

// ---------- 1d. Restore the admin's zero-home seed state ----------
console.log('=== 1d. Cleanup test home ===');
await navTo(page, 'Biens', 'Biens');
await page.waitForTimeout(800);
if (
  await page
    .getByText(ADMIN_HOME)
    .first()
    .isVisible()
    .catch(() => false)
) {
  await deleteHome(page, ADMIN_HOME);
  const stillThere = await page
    .getByText(ADMIN_HOME)
    .first()
    .isVisible()
    .catch(() => false);
  if (stillThere) bad('test home still listed');
  else ok('test home deleted');
} else bad('test home not found in Biens');
await page.screenshot({ path: SHOT('01d-deleted') });

// ---------- 2. Impersonate Conciergerie Azur ----------
console.log('=== 2. Impersonate Conciergerie Azur ===');
await impersonate(page, 'Conciergerie — Conciergerie Azur');
const impBanner = await page
  .getByText(/Vue en tant que/i)
  .first()
  .isVisible()
  .catch(() => false);
if (impBanner) ok('impersonation banner visible');
else bad('impersonation banner MISSING');
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
if (homeVisible) ok(`home "${HOME}" created`);
else bad('home NOT in list');
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
if (missionVisible) ok('mission created & listed');
else bad('mission NOT listed');
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
    } catch {
      /* modal already closed */
    }
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
if (hist) ok('mission visible in history');
else bad('mission NOT in history');
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
if (histC) ok('mission in conciergerie completed list');
else bad('mission NOT in conciergerie completed list');
if (histC) {
  await clickInActive(page, HOME);
  await page.waitForTimeout(1800);
  const reportText = await page
    .getByText(/Compte rendu|Phase F/)
    .first()
    .isVisible()
    .catch(() => false);
  if (reportText) ok('report visible to conciergerie');
  else bad('report NOT visible');
  await page.screenshot({ path: SHOT('13-report-view') });
}

// ---------- 9. Review settings (still impersonating Conciergerie Azur) ----------
// Reviews upsert per (userType, rowKey); user_type CHECK excludes 'admin', so
// this must run on an impersonated conciergerie/employee session.
console.log('=== 9. Review settings ===');
await closeTopModal(page); // step 8 leaves the mission details modal open
await navTo(page, 'Paramètres', 'Votre avis');
await closeChangelog(page);
await openReviewSection(page);

// Clean slate first: a leftover review shows "Modifier mon avis" instead of
// "Publier mon avis" and pre-fills the stars (clicking 5 would toggle back to 0)
const existingDelete = reviewForm(page).getByRole('button', { name: 'Supprimer', exact: true });
if (await existingDelete.isVisible().catch(() => false)) {
  await dispatchClick(page, existingDelete);
  await reviewForm(page).getByRole('button', { name: 'Publier mon avis', exact: true }).waitFor({ timeout: 10000 });
  ok('pre-existing review removed (clean slate)');
}

const COMMENT = `Avis E2E ${Date.now() % 100000} — outil au top, je recommande.`;
await dispatchClick(page, reviewForm(page).locator('button[aria-label="5 étoiles"]'));
await reviewForm(page).locator('#review-comment').fill(COMMENT);
await dispatchClick(page, reviewForm(page).getByRole('button', { name: 'Publier mon avis', exact: true }));
const editBtn = await reviewForm(page)
  .getByRole('button', { name: 'Modifier mon avis', exact: true })
  .waitFor({ timeout: 10000 })
  .then(() => true)
  .catch(() => false);
if (editBtn) ok('review saved → "Modifier mon avis" shown');
else bad('review save failed');
await page.screenshot({ path: SHOT('14-review') });

// Persistence: leave settings, come back, reopen the section
await navTo(page, 'Missions', 'ission');
await navTo(page, 'Paramètres', 'Votre avis');
await openReviewSection(page);
const persisted =
  (await page
    .locator('button[aria-label="5 étoiles"][aria-checked="true"]')
    .isVisible()
    .catch(() => false)) &&
  (await reviewForm(page)
    .locator('#review-comment')
    .inputValue()
    .catch(() => '')) === COMMENT;
if (persisted) ok('review persisted (5 stars + comment)');
else bad('review NOT persisted');

// Public landing testimonial — soft check: /landing server-action useEffects are
// flaky on the dev server (verified working in production).
console.log('  landing check (soft)…');
await page.goto(`${BASE}/landing`, { waitUntil: 'domcontentloaded' });
const onLanding = await page
  .getByText(COMMENT)
  .first()
  .waitFor({ state: 'visible', timeout: 20000 })
  .then(() => true)
  .catch(() => false);
if (onLanding) ok('review comment on landing testimonials');
else console.log('  ~ review NOT on landing (dev hydration lag — non-blocking)');
await page.screenshot({ path: SHOT('15-landing') });

// Delete the review — restores seed state (no reviews are seeded)
await page.goto(`${BASE}/missions`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('nav.fixed.bottom-0', { timeout: 30000 });
await page.waitForTimeout(4000); // fresh load: let hydration settle before nav clicks
await navTo(page, 'Paramètres', 'Votre avis');
await closeChangelog(page);
await openReviewSection(page);
await dispatchClick(page, reviewForm(page).getByRole('button', { name: 'Supprimer', exact: true }));
const publishBack = await reviewForm(page)
  .getByRole('button', { name: 'Publier mon avis', exact: true })
  .waitFor({ timeout: 10000 })
  .then(() => true)
  .catch(() => false);
if (publishBack) ok('review deleted → "Publier mon avis" back');
else bad('review delete failed');
await page.screenshot({ path: SHOT('16-review-deleted') });

await browser.close();
console.log('=== DONE ===');
