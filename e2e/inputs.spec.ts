import { expect, test } from 'playwright/test';

// Input filtering: invalid characters are rejected as the user types
// (partial-regex filter via keydown + onChange), and every editable
// field enforces a max length. Phone format is national digits-only:
// 0[1-9]XXXXXXXX — ten digits, no separators, no international prefix.
//
// Ordre des describes : Onboarding en premier — il dépend du fetch DB
// conciergeries, qui ne répond plus si les pages landing ont saturé le
// pool de connexions du dev server avant lui.

test.describe('Onboarding — formulaire prestataire', () => {
  // Une seule page-load = un seul fetch conciergeries (le pooler Supabase
  // s'épuise si chaque test recharge — cold start peut dépasser 20 s).
  test.describe.configure({ timeout: 120000 });

  test('filtres partiels + maxLength via le composant Input partagé', async ({ page }) => {
    await page.goto('/?type=employee');
    // ?type=employee pré-sélectionne le formulaire ; il attend le chargement
    // des conciergeries (fetch DB — cold start Supabase peut dépasser 20 s)
    await expect(page.locator('#firstName')).toBeVisible({ timeout: 90000 });

    // Téléphone : lettres et 11e chiffre rejetés
    const tel = page.locator('#tel');
    await tel.pressSequentially('a06123456789');
    await expect(tel).toHaveValue('0612345678');

    // Email : espaces et doubles @ rejetés
    const email = page.locator('#email');
    await email.pressSequentially('jo hn@@doe.f r');
    await expect(email).toHaveValue('john@doe.fr');

    // Prénom/nom : chiffres rejetés, le caractère valide suivant est conservé
    const firstName = page.locator('#firstName');
    const familyName = page.locator('#familyName');
    await firstName.pressSequentially('J3an-Pi1erre');
    await expect(firstName).toHaveValue('Jan-Pierre');
    await familyName.pressSequentially('Dup0nt');
    await expect(familyName).toHaveValue('Dupnt');

    // maxLength natif : 32 caractères max sur les champs texte
    await firstName.fill('y'.repeat(40));
    await expect(firstName).toHaveValue('y'.repeat(32));
  });
});

test.describe('Landing — formulaire de contact', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/landing');
    await page.locator('#contact-name').scrollIntoViewIfNeeded();
  });

  test('téléphone : les lettres sont rejetées', async ({ page }) => {
    const phone = page.locator('#contact-phone');
    await phone.pressSequentially('ab06cd12');
    await expect(phone).toHaveValue('0612');
  });

  test('téléphone : doit commencer par 0', async ({ page }) => {
    const phone = page.locator('#contact-phone');
    // 9..1 ne peuvent pas ouvrir un numéro national ; le 0 final est accepté
    await phone.pressSequentially('9876543210');
    await expect(phone).toHaveValue('0');
    await phone.pressSequentially('612345678');
    await expect(phone).toHaveValue('0612345678');
  });

  test('téléphone : séparateurs rejetés, plafonné à 10 chiffres', async ({ page }) => {
    const phone = page.locator('#contact-phone');
    await phone.pressSequentially('06 12.34-56 789');
    // Espaces, points et tirets n'entrent jamais ; le 11e chiffre est rejeté
    await expect(phone).toHaveValue('0612345678');
  });

  test('téléphone : préfixe international rejeté', async ({ page }) => {
    const phone = page.locator('#contact-phone');
    await phone.pressSequentially('+33612345678');
    // '+', puis '3','3','6'… : aucun caractère ne peut ouvrir un numéro
    // national (qui commence par 0) — tout est refusé
    await expect(phone).toHaveValue('');
  });

  test('email : espaces et double @ rejetés', async ({ page }) => {
    const email = page.locator('#contact-email');
    await email.pressSequentially('je an@@test');
    await expect(email).toHaveValue('jean@test');
  });

  test('nom : maxLength 32 appliqué', async ({ page }) => {
    const name = page.locator('#contact-name');
    await name.fill('x'.repeat(40));
    await expect(name).toHaveValue('x'.repeat(32));
  });
});
