# Plan v3 — coexistence v2 / v3

Marqueurs d'avancement : `[ ]` à faire · `[✅]` terminé.
Principe : chaque objectif devient `[✅]` uniquement une fois déployé/vérifié.

## Décisions actées

- **v2** = clients actuels (CMD Breizh, Calluna Conciergerie, MENTHERÉGLISSE).
  Ils gardent l'app telle quelle, leur forfait et leur remise 40 % (30 €/mois).
- **v3** = nouvelles fonctionnalités. Nouveaux clients et démo en v3.
- Les clients v2 **voient** les nouveautés v3 (aperçu verrouillé dans l'app +
  la démo publique tourne en v3) mais ne peuvent pas les utiliser.
- Upgrade v2 → v3 : passage au **plein tarif** (fin de la remise 40 %).
- Chaque conciergerie reste facturée pour elle-même — pas de facture groupe.
- **Nommage** : `v2_` est déjà le préfixe des device-ids (`app/utils/id.ts`).
  En DB/code on parle de `conciergeries.version` (`'v2' | 'v3'`) — sans
  aucun rapport avec les credentials.

## Phase 0 — Socle technique

- [✅] Migration `migrations/add_product_version.sql` :

```sql
ALTER TABLE conciergeries
  ADD COLUMN version TEXT NOT NULL DEFAULT 'v3'
  CHECK (version IN ('v2', 'v3'));

-- Toutes les lignes existantes = clients actuels → v2
UPDATE conciergeries SET version = 'v2';
-- L'admin (tenant de gestion) reste sur la version la plus récente
UPDATE conciergeries SET version = 'v3' WHERE name = 'Admin';
```

Le `DEFAULT 'v3'` fait que tout futur INSERT (provisioning manuel,
seed démo) est v3 sans code supplémentaire.

- [✅] Appliquer la migration : dev, `DEMO_DATABASE_URL`, prod —
  Admin en v3, les 3 clients en v2 ; les lignes démo existantes
  basculées en v3 (le reseed périodique les recrée en v3 via le
  DEFAULT).
- [✅] Types : `DbConciergerie` / `Conciergerie` (`ProductVersion`) +
  `formatConciergerie` (fail-closed : tout sauf `'v3'` explicite →
  `'v2'`) + fixture de test.
- [✅] Helper `app/utils/version.ts` : `isV3(conciergerie)`,
  `requireV3(conciergerie)` (lève une erreur côté serveur).
- [✅] Vérifier que `demoSeed.ts` produit des conciergeries v3 :
  aucun code requis, le DEFAULT 'v3' couvre les INSERT du seed.

## Phase 1 — Gating (voir sans pouvoir utiliser)

- [✅] Résolution serveur : `app/db/versionDb.ts` —
  `getConciergerieVersion` / `getUserVersion` (employés → version de
  leur conciergerie) / `getSessionVersion` (impersonation = cible).
  Fail-closed : inconnu → `'v2'`.
- [✅] Composants UI `app/components/featureLocked.tsx` : `V3Badge`
  (pill « v3 » inline) + `FeatureLocked` (aperçu grisé non
  interactif + badge, pour les futures features de page entière).
- [✅] Settings → ligne « Version » dans `conciergerieSettings` :
  affiche la version ; pour v2, bouton « Passer en v3 » → modal
  expliquant le tarif plein (remise non conservée) + CTA mailto.
- [✅] `fetchConciergeries` : expose `version` sur toutes les lignes
  (les employés résolvent la version de leur tenant) + champs billing
  (`discount`, `billingPeriod`, `planUntil`) sur sa propre ligne
  uniquement — corrige au passage l'affichage remise/annuel qui
  lisait `undefined` au chargement.
- [✅] Teasers : **entrées de menu visibles mais verrouillées** (badge « v3 » + aperçu) — montrer pour donner envie, plutôt que des pages cachées.

### Features déjà gatées

- **Notifications push** (`push_subscriptions`, envoi + foreground) :
  - `saveMyPushSubscription` : plan Pro+ **ET** tenant v3 requis.
  - `sendPushToUser` (pushDb) : même double gate — couvre tous les
    chemins d'envoi (actions email, cron late-missions, test push) et
    coupe les abonnements legacy des tenants v2.
  - `fireForegroundNotification` : `pushAllowed` = plan Pro+ ET v3.
  - Settings : toggle visible mais désactivé pour v2 + badge « v3 » +
    message « nouveauté de la version 3 ».

## Phase 2 — Provisioning & démo

- [✅] Doc provisioning : section « Product versions (v2 / v3) » ajoutée à
  `PLAN_SAAS.md` — nouveaux clients = v3 par défaut (DEFAULT), v2 =
  `UPDATE` explicite, upgrade = `version='v3'` + `discount=0`.
- [✅] Démo vérifiée : Admin + Azur + Léon en v3 (vérifié via psql) ; le
  reseed périodique recrée tout en v3 via le DEFAULT — la démo est le
  showroom v3 (teasers invisibles puisque tout est débloqué).
- [✅] Landing : aucune mention v2/v3 côté marketing (v3 = le produit).

## Phase 3 — Développement des features v3

À remplir au fur et à mesure. Convention : chaque feature = guard backend
`requireV3()` + teaser `FeatureLocked` pour les v2 + tests dans les deux
modes (fixtures v2 et v3).

- [ ] _(feature 1 — à définir)_
- [ ] _(feature 2 — à définir)_

## Phase 4 — Upgrade v2 → v3

- [ ] Pricing décidé : plein tarif du forfait (ex. Pro 50 € au lieu de
      30 €) — la remise ne survit pas à l'upgrade.
- [ ] Upgrade manuel d'abord (documenté) :

```sql
UPDATE conciergeries
SET version = 'v3', discount = 0
WHERE name = '<conciergerie>';
```

- [ ] Plus tard : bouton in-app → paiement one-shot Revolut ou bascule de
      forfait, qui applique ce UPDATE automatiquement.
- [ ] Facturation : les lignes `discount`/`version` sur les factures
      restent des snapshots — l'historique v2 à 30 € est préservé.

## Phase 5 — Communication & fin de vie v2

- [ ] Annoncer aux clients v2 : v2 maintenu en l'état, v3 disponible sur
      demande. **Pas de date butoir** — support v2 = corrections de bugs
      uniquement, l'app tourne et reste telle quelle indéfiniment. Une
      date ne sera fixée que si un besoin réel apparaît.
- [ ] Changelog : rédigé par Flo (jamais par l'agent).

## Règles pendant la coexistence

- Toute nouvelle feature → derrière `isV3`, guard serveur obligatoire.
- Les bugfixes restent communs : v2 et v3 partagent le même code, seules
  les features diffèrent — pas de fork de comportement.
- Tests : chaque feature v3 est testée en mode v2 (refus) et v3 (succès).
- Pas de `version` côté client seul : le serveur tranche toujours.
