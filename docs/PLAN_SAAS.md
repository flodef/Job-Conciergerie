# Plan SaaS — Job Conciergerie

> Exécution **manuelle et incrémentale** : des clients utilisent l'app en prod.
> Règles d'or pour toutes les phases :
>
> - Migrations **additives uniquement** (colonnes nullable, nouvelles tables) — jamais de rename/drop.
> - Chaque étape doit être déployable et réversible indépendamment.
> - Backup DB (`pg_dump` / snapshot Supabase) avant chaque migration.
> - Travailler sur une branche dédiée, tester sur une preview/deploy de staging avant merge.

---

## Phase A — Sécurité (ex-"point 6") ✅ FAIT

**Objectif** : fermer les trous sans changer le comportement visible pour les utilisateurs actuels.

### A.1 — IDs cryptographiquement sûrs ✅ FAIT

- `generateSecureId()` (`v2_` + 128 bits via `crypto.getRandomValues`) remplace `generateSimpleId` partout.
- **Rotation transparente** : `v2 = v2_ + HMAC-SHA256(id, ID_ROTATION_SECRET ‖ SUPABASE_SERVICE_ROLE_KEY)` — déterministe → idempotent, sans race, cookie périmé auto-réparé. `getSessionUser()` réécrit l'ancien id en place (`array_replace`, gère aussi les `$` pending) et met à jour le cookie — migration invisible pour l'utilisateur.

### A.2 — Vérification côté serveur ✅ FAIT (étape 1)

- `app/db/session.ts` : `getSessionUser()` (cookie `user_id` → résolution DB avec sémantique `$` → rotation lazy), `getSessionDeviceId()`, `getSessionCredentialIds()`, `isValidDeviceIdsUpdate()`.
- Guards `getSessionUser()` sur : fetchEmployees/fetchConciergeries, mutations employee/conciergerie/home/mission/missionReport, storage (`verifyAuth`/`verifyConciergerieAuth` réécrits — ils ne faisaient que lire des cookies forgables), ipfs, emails de contexte authentifié (`!isRetry` — les retries cron passent).
- **Les `id[]` ne sont plus exposés** : les listes ne retournent le tableau d'ids que sur la ligne de l'appelant (`id: []` ailleurs). `lookupEmployeeByContact` (public, inscription) retourne `id: []`.
- Enrôlement recalculé côté serveur : `enrollEmployeeDevice`/`enrollConciergerieDevice` (le client ne fabrique plus le tableau — fin de l'overwrite arbitraire = takeover). `updateXWithUserId` réservé aux membres connectés de la ligne.
- `proxy.ts` : regex d'URL étendue à `v2_[0-9a-f]{32}` ; `/api/auth` utilise `getExistingUserTypeResilient` (fallback rotaté).
- Reste public par design : `lookupEmployeeByContact`, `createNewEmployee`, `enroll*Device`, emails waiting-page/cron, `environment.ts`.
- Limite d'enrôlement ouvert fermée par **A.5** (token signé dans le lien email).
- Étape 2 (Phase C) : scoper par `client_id`.

### A.3 — Signature du webhook Revolut ✅ FAIT

- Vérif `Revolut-Signature` HMAC-SHA256 sur `v1.{timestamp}.{rawBody}`, fenêtre ±5 min, multi-signatures (rotation de secret). Actif dès `REVOLUT_WEBHOOK_SECRET` configuré.

### A.5 — Token d'enrôlement signé ✅ FAIT

**Attaque fermée** : `enroll*Device` acceptait tout appelant — connaître `first_name + family_name` (ou le nom d'une conciergerie) suffisait à ajouter son `user_id` dans le `id[]` de la cible → usurpation. L'email de vérification n'était pas une preuve : le lien contient l'id de l'appareil _demandeur_, que l'attaquant connaît déjà.

**Implémentation** :

- `enrollmentToken(kind, rowKey, deviceId)` dans `app/db/session.ts` : `exp.sig` où `sig = HMAC-SHA256(enroll|kind|rowKey|deviceId|exp)` tronqué à 32 hex, clé `hmacSecret()` (= `ID_ROTATION_SECRET ‖ SUPABASE_SERVICE_ROLE_KEY`), TTL **7 jours**. Vérif `timingSafeEqual`, sync.
- Liens générés côté serveur dans `sendConciergerieVerificationEmail` et `sendNewDeviceNotificationEmail` : `/${deviceId}?t=<token>` — le token est lié au **device de session de l'appelant** et le destinataire est **re-fetché en DB** (l'objet client n'est plus jamais utilisé pour l'adresse → impossible de rediriger le lien vers sa propre boîte).
- `enroll*Device` exige le token pour un appelant **non membre** ; un membre (match sur `baseId`, `$` inclus) n'en a pas besoin → les anciens appareils continuent de fonctionner, seuls les nouveaux enrôlements passent par l'email.
- `/[id]` lit `searchParams.t` et le passe à `enroll*Device`.
- `employeeForm` (ré-inscription d'un employé existant) : n'enrôle plus directement — envoie l'email de vérification puis va sur `Waiting` ; l'enrôlement se fait au clic du lien (preuve de possession de la boîte).
- Décision : **pas de fenêtre de rétrocompat** — les vieux emails sans `?t=` échouent pour les non-membres ; l'utilisateur renvoie un email depuis la page d'attente. Coût : uniquement les liens envoyés dans les jours précédant le déploiement.

### A.6 — Demandes d'accès `$` sécurisées ✅ FAIT (approbation depuis un appareil connecté)

Le flow « approuver le nouvel appareil inconnu depuis Paramètres » est restauré, **sans rouvrir le trou** : un appareil `$` obtient désormais une **session pending sans privilèges**.

- `resolveMembership` (session.ts) distingue match exact (connecté) vs match `$` (pending) → `SessionUser.pending`.
- `requireConnectedSession()` remplace `getSessionUser()` dans tous les guards sensibles (home, mission, missionReport, storage, ipfs, mutations employee/conciergerie, emails métier) → un `$` ne peut rien lire/écrire de protégé.
- `enroll*Device` : non-membre **sans token** → ajoute `$id` (demande d'accès visible dans Appareils) ; token valide → connexion directe ; membre connecté → libre. `alreadyMember` ne compte que les ids **connectés** → un `$` ne peut pas s'auto-approuver.
- Listes : membre connecté → `id[]` réel ; membre pending → `['$'+sonId]` (suffit pour `containsId`, ne fuite pas les vrais credentials — sinon un pending volerait les ids de la victime).
- `getDevices` préserve les `$` des autres appareils (avant : tout ajout les écrasait) + cap `MAX_DEVICES-1` anti-spam ; la limite `MAX_DEVICES` ne s'applique qu'aux appareils **connectés** (une demande ne consomme pas de slot).
- `employeeForm` ré-enrôle en `$` (sans token) puis envoie l'email → les deux chemins d'approbation coexistent comme avant.
- `/[id]` : `result.pending` → `Waiting` au lieu de `Missions`.
- `api/auth`/`proxy` : inchangés — `getExistingUserType` fait déjà un match exact (`$` non résolu → `/waiting` autorisé, routes protégées → `/error`), conforme à l'ancien comportement.
- Bonus : la page d'attente survit au F5 (la session pending résout `userType`/`userData`, alors qu'un appareil sans session perdait son état).

### A.4 — Durcissements optionnels

- ✅ **Rate limiting sur les actions sensibles** : `app/db/rateLimit.ts` — fenêtre fixe persistée en Postgres (`rate_limits`, clés hashées sha256 — pas d'IP en clair), partagée entre instances serverless. Protégés : `lookupEmployeeByContact` (10/10 min), `createNewEmployee` (5/10 min), `enroll*Device` (10/10 min par IP **+** 5/h par appareil), `sendConciergerieVerificationEmail`/`sendEmployeeRegistrationEmail`/`sendNewDeviceNotificationEmail`/`sendEmployeeConflictReport` (5/10 min). Failles `null`/`false` existantes réutilisées ; les callers affichent un toast d'erreur quand l'envoi échoue.
- ✅ **Device-ids hashés en DB (sha256)** : `hashId` (serveur, `db.ts`) / `hashIdAsync` (client, `utils/id.ts` — `crypto.subtle`). Cookies, localStorage, liens email et URLs `/[id]` gardent l'id **brut** ; seules les colonnes `employees.id`/`conciergeries.id` stockent le hash. Lectures **dual-match** (brut OU sha256) → transition non atomique possible, rollback safe. Écritures toujours hashées (enrôlement, `createNewEmployee`, rotation legacy → `hash(v2_)`, marqueur `$` préservé : `$hash`). Côté client, `userIdHash` est calculé une fois dans `authProvider` pour les comparaisons synchrones. Migration : `bun scripts/hash-device-ids.ts` (dry-run) / `--apply` — idempotent, n'affiche aucun id. **Ordre prod impératif** : déployer le code dual-match AVANT de migrer la prod (l'ancien code ne lit que le brut). Rollback DB = restauration du dump (`backups/prod-pre-hash-*.sql`).
- ✅ **Expiration glissante des appareils** (`app/db/deviceSeen.ts`) : table `device_seen(device_hash PK, last_seen)` — clés en domaine hash, jamais d'id brut. À chaque `getSessionUser` : touch throttlé (1 écriture/h/appareil), seed-on-sight des entrées sans horloge (pas de lockout massif au déploiement), prune des entrées > `DEVICE_TTL_DAYS` (défaut 90j) en compare-and-swap. Un credential expiré résout en session **dégradée** (limp-home : `pending`, zéro privilège) tant que l'entrée n'est pas balayée — l'enrôlement la remplace (`$`) ou reconnecte (token email) en **resetant l'horloge** (`touchDevices`/`touchDeviceKeys` sur enroll + approbation). Migration : `migrations/create_device_seen.sql` (création lazy + backfill optionnel).

**Livrable** : app identique pour les utilisateurs, DB plus lisible anonymement, webhook authentifié.

---

## Phase B — Merger `landing/` dans `app/` (pattern Tradiz) ✅ FAIT

**Objectif** : un seul déploiement Next qui sert la vitrine ET l'app, dispatch par host dans `proxy.ts`.

**Réalisé** : route groups `app/(app)/` (toutes les routes existantes, URLs inchangées) et `app/(site)/` (`/landing`, `/checkout`, code partagé dans `_lib`/`_components`/`_actions`). Routes API Revolut sous `app/api/`. `global-error.tsx` rend désormais son propre `<html>` (obligatoire sans root layout partagé) et `app/global-not-found.tsx` (expérimental `globalNotFound: true` dans `next.config.ts`) couvre les 404 globales. Dispatch host dans `proxy.ts` via le header `Host` (pas `nextUrl.hostname` — normalisé en dev) : apex/www → `/` réécrit `/landing`, `/landing` + `/checkout` publics sur tous les hosts. `landing/` supprimé, `REVOLUT_SETUP.md` → `docs/`. Bonus : la navigation inter-groupes est un full page reload → aucune fuite de thème.

### B.1 — Route groups + double root layout ✅ FAIT

- Supprimer `app/layout.tsx` partagé, créer :
  - `app/(app)/layout.tsx` → reprend le layout actuel (html, fonts Geist, providers, `MaintenanceCheck`, `ServiceWorkerRegister`, `h-dvh`…)
  - `app/(site)/layout.tsx` → html/body + `landing-globals.css` + script d'init du thème (déjà écrit dans `landing/app/layout.tsx`)
- Déplacer toutes les routes existantes dans `app/(app)/` — **URLs inchangées** (les groupes ne comptent pas dans le path). L'alias `@/` ne bouge pas.
- `not-found.tsx` / `global-error.tsx` : sans root layout il faut `global-not-found.tsx`/`global-error.tsx` autonomes (avec leur propre `<html>`) — point délicat, à tester en build local.
- Risque : moyen (gros `git mv`). Mitigation : tout bouger en un commit, vérifier `bun run build` + smoke test des pages.

### B.2 — Porter la landing ✅ FAIT

- `landing/app/page.tsx` → `app/(site)/landing/page.tsx` (path `/landing`)
- `landing/app/checkout/` → `app/(site)/checkout/` (path `/checkout`)
- `landing/app/theme.ts`, `components/Logo`, `actions/contact.ts`+`antiSpam.ts`, `api/create-order`, `api/revolut-webhook` → sous `app/(site)/` et `app/api/`
- `landing/app/globals.css` → `app/(site)/landing.css` importé par `(site)/layout.tsx` — le CSS est scopé par route, pas de conflit avec `app/globals.css`.
- `landing/public/breton-flag.svg` → `public/`
- Cleanup navigation : quitter la landing doit retirer `.light`/`data-theme`/`color-scheme` de `<html>` (effet de démontage dans `(site)/layout.tsx` ou dans `useTheme`) — sinon le style fuite sur l'app en navigation client-side.

### B.3 — `proxy.ts` : hosts + paths publics ✅ FAIT

- Ajouter aux paths sans auth : `/landing`, `/checkout`, `/api/create-order`, `/api/revolut-webhook`, `/breton-flag.svg`.
- Host logic (copie du pattern `handleLandingHost` de Tradiz) :
  - `job-conciergerie.fr`, `www.job-conciergerie.fr` → rewrite `/` → `/landing` ; `/checkout` passe tel quel.
  - `app.job-conciergerie.fr` → app normale.
  - Prévoir le hook `demo.` pour la Phase E (header `x-demo: 1` ou rewrite).
- `RESERVED_PATHS` += `landing`, `checkout`.

### B.4 — Env & déploiement ✅ FAIT

- `REVOLUT_*`, `SMTP_*`, `CONTACT_*` → `.env.local` racine + variables du hébergeur.
- Un seul site Netlify/Vercel sert les 2 (puis 3) hosts.
- Supprimer `landing/` une fois validé (garder `landing/proxy.ts` stub tant que le sous-projet existe — il répare le build local).

**Livrable** : un repo = un build = apex vitrine + app.

---

## Phase C — Multi-tenant (ex-"point 1")

**Pré-requis : Phase A.2 faite** (sinon le scoping n'a aucun sens).

### C.1 — Schéma (migration additive) ✅ FAIT

- `migrations/create_clients.sql` : table `clients` (`id uuid pk`, `name`, `email`, `plan`, `status`, `is_admin`, `created_at`) + `client_id uuid null` (FK) sur `conciergeries`, `employees`, `homes`, `missions`, `mission_reports`, `email_logs` + index.
- Backfill : un client `legacy` unique absorbe toutes les lignes existantes → zero downtime, comportement identique (CMD, Calluna, Mentheréglisse restent mutuellement visibles, comme avant). **À jouer sur prod AVANT le déploiement du code scopé** (fail-closed : `client_id NULL` → invisible aux lectures scopées).

### C.2 — Modèle ✅ FAIT

- `employees.client_id` (un employé appartient au client, pas à une conciergerie → le multi-conciergerie partage les employés ; `conciergerie_name` reste pour l'assignation).
- Jointures par `conciergerie_name` conservées (renommer en ids = chantier à part, risqué).
- Super-admin : flag `is_admin` sur `clients` — un membre d'un client admin voit tous les tenants.

### C.3 — Scoping serveur ✅ FAIT

- `getSessionUser()` étendu → `{ …, clientId, isAdmin }` (join `clients` dans `resolveMembership`).
- `tenantScope(session)` : `undefined` = unscoped (admin, cron, agrégats publics) ; sinon `client_id = cid` ; `clientId` NULL → sentinel qui ne matche rien (**fail-closed**).
- Scopé : `getAllEmployees`/`getAllHomes`/`getAllMissions`/`getMissionsBy*`/`getAvailableMissionsForEmployee`/`getMissionById`/`getHomeById`/`getMissionReport(s)*` + mutations (`update*`, `delete*`, `claimLateNotification`). Stamp à l'écriture : `createHome`/`createMission`/`createMissionReport` = `session.clientId`, `createEmployee` = client de la conciergerie choisie (`getConciergerieClientId`).
- Non scopé par design : `fetchConciergeries` (le picker d'inscription liste toutes les conciergeries), `findEmployeeByContact` (dedup global tel/email), `getExistingUserType` (proxy), cron `check-late-missions`, `email_logs` (colonne posée, non alimentée), stats landing (agrégats publics).
- Vérifié : tenant 2 seedé → listes filtrées, sentinel → 0 ligne. E2E 26/26.

### C.4 — Abonnements / Forfaits

État actuel : `conciergeries.plan` (`decouverte|pro|privilege`) existe, affiché **en lecture seule** dans les paramètres conciergerie (`Select` désactivé dans `conciergerieSettings.tsx`, tooltip "Contactez-nous pour changer de forfait"). L'écriture est déjà supportée côté serveur (`updateConciergerie`) — utilisable via SQL/script admin.

- **Migration vers `clients`** : en C.1, `plan` doit vivre sur `clients`, pas `conciergeries` → transférer la colonne au moment du backfill (CMD, Calluna, Mentheréglisse = `pro`), puis supprimer `conciergeries.plan` dans une migration ultérieure.
- **Rendre le forfait éditable** depuis les paramètres une fois la facturation / les règles de transition décidées (upgrade immédiat ? downgrade en fin de période ? paiement Revolut ?).
- **Enforcer les conditions par forfait côté serveur** (jamais seulement côté client). Limites à définir et appliquer, par exemple :
  - Découverte : **20 logements maximum** (`homes`)
  - Découverte : quotas missions / prestataires à préciser
  - Pro / Privilège : limites éventuelles à préciser
  - À la création, bloquer ou avertir quand la limite est atteinte, avec un message proposant le forfait supérieur.

---

## Phase D — Domaines (ex-"point 2")

- DNS : `job-conciergerie.fr` + `www.` → le déploiement unique ; `app.job-conciergerie.fr` → idem.
- Mettre à jour : `NEXT_PUBLIC_APP_URL` (= `https://app.job-conciergerie.fr`), les liens magiques `/<id>` dans les emails (**critique** — doivent pointer `app.`), `redirect_url` Revolut, URL du webhook dans le dashboard, redirect URLs Supabase.
- Décider du sort des anciens liens `/<id>` déjà envoyés (redirect apex → app, ou rewrite).

## Phase E — Démo (ex-"points 3/4/5")

- `demo.job-conciergerie.fr` → `proxy.ts` pose `x-demo` (pas de branche séparée à maintenir).
- DB dédiée : `DEMO_DATABASE_URL` (projet Supabase séparé) — jamais de write démo en prod. `db.ts` choisit l'URL selon le header/env.
- `scripts/seed-demo.ts` : 1 client, 2-3 conciergeries, ~6 employés, ~10 biens, missions couvrant tous les statuts/dates.
- Entrée démo : boutons « Essayer en tant que concierge / employé » sur la vitrine → posent le `user_id` seedé → redirect app. (Trivial avec l'auth par id.)
- Reset : serverless ≠ "démarrage d'instance" → route `/api/demo/reset` appelée par cron (Netlify scheduled) + lazy check `seeded_at > 12h` → reseed.
- Garde-fous démo : bandeau "Démo", emails réels désactivés (logs only), pas de paiement.

## Phase F — Tests scénarios démo (ex-"point 4")

Checklist manuelle (concierge **et** employé) : créer un bien, créer une mission (dont binôme), employé accepte, compte rendu photo, historique, notifications. + quelques tests vitest sur les actions critiques.

## Phase G — Revolut prod (ex-"point 7")

- Clés prod + `REVOLUT_MODE=prod` + webhook prod signé (A.3).
- `ORDER_COMPLETED` → provisionner le `client` (Phase C) + email avec lien magique `/<id>`.
- Test sandbox end-to-end avant bascule.

---

## Ordre & dépendances

```
A (sécu) ──► B (merge landing) ──► C (multi-tenant) ──► D (domaines) ──► E (démo) ──► F (tests) ──► G (revolut prod)
```

- **A avant C** : scoper par tenant sur des actions non authentifiées ne protège rien.
- **B avant D/E** : le dispatch par host suppose un seul déploiement.
- **C avant E** : le seed démo utilise le modèle `clients` (sinon refaire le seed après).
- D et C peuvent s'intervertir si les domaines sont urgents.
