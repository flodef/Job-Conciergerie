import { expect, test } from 'playwright/test';
import { readFileSync } from 'fs';
import postgres from 'postgres';

// Plan self-service: the demo admin impersonates a demo conciergerie, opens
// the "Comparer les forfaits" matrix, switches plan — then we verify BOTH the
// updated settings row AND the plan_changes billing log in the demo database.
//
// Runs against demo.localhost (allowed dev origin → proxy routes it to
// DEMO_DATABASE_URL). The demo seed puts 'Conciergerie Azur' on 'pro', but
// the test is adaptive — it picks whatever other plan is offered — so it
// survives repeated runs without a reseed.

const DEMO_DEVICE_ID = 'v2_de01de01de01de01de01de01de01de01';
const DEMO_BASE = 'http://demo.localhost:3000';
const PLAN_DB: Record<string, string> = { Découverte: 'decouverte', Pro: 'pro', Privilège: 'privilege' };

test.describe('Forfait — comparatif et changement (démo)', () => {
  // Cold starts (demo DB, dev server) can exceed the default 30 s.
  test.describe.configure({ timeout: 180000 });

  test('impersonation → comparatif → changement de forfait + log billing', async ({ page }) => {
    // The changelog modal auto-opens on first login and overlays the nav —
    // pre-seed its "seen" flag so it never appears.
    const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
    await page.addInitScript(v => localStorage.setItem('changelog_seen_version', v), version);

    // 1. Public demo credential → admin session on the demo database
    await page.goto(`${DEMO_BASE}/${DEMO_DEVICE_ID}`);
    const settingsNav = page.getByRole('button', { name: 'Paramètres' });
    await expect(settingsNav).toBeVisible({ timeout: 90000 });

    // 2. Settings → Administration → impersonate 'Conciergerie Azur'
    await settingsNav.click();
    await page.getByRole('button', { name: 'Administration' }).click();
    await page.locator('#impersonate-target').click();
    await page.getByRole('option', { name: 'Conciergerie Azur' }).click();
    await page.getByRole('button', { name: 'Voir en tant que', exact: true }).click();
    await expect(page.getByText(/Vue en tant que.*Conciergerie Azur/)).toBeVisible({ timeout: 60000 });

    // 3. Settings → Général → the Forfait row shows the current plan
    await settingsNav.click();
    await page.getByRole('button', { name: 'Général' }).click();
    await expect(page.getByText(/— \d+ €\/mois/)).toBeVisible({ timeout: 30000 });

    // 4. "Comparer les forfaits" → matrix modal (current plan highlighted)
    await page.getByRole('button', { name: 'Comparer les forfaits' }).click();
    await expect(page.getByText('Multi-conciergerie')).toBeVisible();
    await expect(page.getByRole('button', { name: /Passer à / }).first()).toBeVisible();

    // 5. Switch to whichever other plan is offered first (adaptive)
    const switchButton = page.getByRole('button', { name: /Passer à / }).first();
    const label = (await switchButton.textContent()) ?? '';
    const targetName = /Passer à (\S+)/.exec(label)?.[1] ?? '';
    expect(PLAN_DB[targetName]).toBeTruthy();
    await switchButton.click();
    await page.getByRole('button', { name: 'Confirmer' }).click();

    // 6. The Forfait row reflects the new plan
    await expect(page.getByText(new RegExp(`${targetName} — \\d+ €/mois`))).toBeVisible({ timeout: 30000 });

    // 7. The billing log recorded the switch (monthly-max invoicing depends on it)
    const demoUrl = readFileSync('.env.local', 'utf8')
      .match(/^DEMO_DATABASE_URL=(.+)$/m)?.[1]
      ?.replace(/['"]/g, '');
    if (demoUrl) {
      const sql = postgres(demoUrl, { max: 1 });
      const rows = await sql`
        SELECT to_plan FROM plan_changes
        WHERE conciergerie_name = 'Conciergerie Azur'
        ORDER BY created_at DESC LIMIT 1
      `;
      await sql.end();
      expect(rows[0]?.to_plan).toBe(PLAN_DB[targetName]);
    }
  });
});
