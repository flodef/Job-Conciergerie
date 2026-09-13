# Protocole de test — Phase A (sécurité)

> **Automatisé** : `bun scripts/test-phaseA.ts` déroule tout le protocole
> (Playwright, 2 contextes navigateur = 2 appareils, vérifications DB incluses).
> La version manuelle ci-dessous reste utile pour explorer un cas précis.
>
> Prérequis manuel : l'app tourne (`bun dev`), un compte employé `accepted`, et
> **deux contextes navigateur distincts** :
>
> - fenêtre normale = **appareil A** (déjà connecté)
> - fenêtre privée = **appareil B** (nouvel appareil — cookies/localStorage séparés)

---

## Emails en dev — ils ne sont PAS envoyés

`deliver()` court-circuite l'envoi hors production (`isProduction()` = false tant
que `DATABASE_URL` ne contient pas l'id du projet Supabase prod). Le mail est
loggué (`[DEV] Email skipped`) et **son HTML complet — lien `?t=` inclus — est
stocké dans `email_logs.body`**. Pour récupérer le dernier lien :

```bash
bun -e "
import { sql } from './app/db/db';
const rows = await sql\`SELECT type, \"to\", body FROM email_logs ORDER BY sent_at DESC LIMIT 3\`;
for (const r of rows) {
  const m = r.body?.match(/https?:\\/\\/[^\\s\"'<>]+\\?t=[^\\s\"'<>]+/);
  console.log(r.type, '→', r.to, '|', m?.[0] ?? '(pas de lien)');
}
await sql.end();"
```

## Test 1 — Enrôlement par email (token valide)

1. Fenêtre privée → formulaire prestataire → **même prénom + nom + email/tél** que
   le compte existant → Valider.
2. **Attendu** : pas d'accès immédiat → redirection `/waiting`, l'appareil
   apparaît en `$` (badge « Nouveau ») dans Paramètres > Appareils de A
   (**rafraîchir la page** — pas de realtime sur les ids).
3. Récupérer le lien via la commande ci-dessus → **l'ouvrir dans la fenêtre
   privée B** (le token est lié au `user_id` de B).
4. **Attendu** : connexion immédiate → `/missions` ; en DB `$v2_…` devient
   `v2_…` en clair.
5. ⚠️ Ouvert **sur A** : le proxy redirige un utilisateur authentifié vers
   `/missions` quel que soit l'id dans l'URL — normal, pas une faille (la session
   vient du cookie, pas de l'URL).

## Test 2 — Token absent ou falsifié

1. Fenêtre privée **fraîche** (pas celle déjà enrôlée — un membre n'a pas besoin
   de token) → formulaire → `/waiting`.
2. Récupérer le `user_id` de cette fenêtre (DevTools > localStorage) → ouvrir
   `/<ce user_id>` **sans** `?t` puis avec `?t=9999999999.deadbeef`.
3. **Attendu** : dans les deux cas l'appareil **reste `$` pending** en DB et est
   redirigé vers `/waiting` — un token invalide est traité comme « pas de token »
   (demande d'accès en attente), jamais comme un accès.
4. **Attendu sécurité** : depuis `/waiting`, un pending ne charge aucune donnée
   protégée (`fetchAllMissions` → `null` côté serveur).

## Test 3 — Membre connecté / liens `/<id>`

1. Sur A (connecté), ouvrir `/<n'importe quel id>` — même un id invalide ou
   modifié.
2. **Attendu** : redirection `/missions` par le proxy — la page `[id]` ne se
   charge jamais pour un utilisateur authentifié. L'id dans l'URL n'est pas un
   credential : c'est le **cookie `user_id`** qui compte.
3. Fenêtre privée fraîche + `/<id existant>` (sans le cookie correspondant) →
   **aucun accès** (redirection `/`). Connaître un id ne suffit pas.

## Test 4 — Rotation transparente des anciens ids

1. Appareil avec un id legacy (base36, sans `v2_`) → recharger l'app.
2. **Attendu** : cookie `user_id` devient `v2_<32 hex>`, Paramètres > Appareils
   montre le nouvel id, **aucune déconnexion**. En DB le legacy est remplacé en
   place (entrées `$` préservées).

## Test 5 — Fuite des `id[]`

> La réponse RSC est illisible dans DevTools — vérification fonctionnelle à la
> place : le script automatisé couvre l'exposition (`['$'+id]` seulement pour le
> pending, tableau complet uniquement sur sa propre ligne). Sinon, en DB :
> `SELECT id FROM employees` doit montrer `$` préfixé pour les pendings.

## Test 6 — Approbation d'un pending par un appareil connecté

1. Fenêtre privée → formulaire avec compte existant → `$` dans Paramètres >
   Appareils de A (après refresh).
2. Sur A : icône « Valider » → `$B` devient connecté en DB.
3. Sur B : F5 → session complète → `/missions` accessible.
4. **Inverse** : un `$` ne peut pas s'auto-approuver (ni via `enroll*`, ni via
   `updateXWithUserId` — le validator exige un id connecté en session).

## Test 7 — Limite d'appareils (5 connectés)

1. Lien email valide sur B → modale « Limite d'appareils atteinte ».
2. Continuer → plus ancien évincé ; Annuler → rien n'est ajouté. Les `$` pending
   ne comptent pas dans la limite (cap anti-spam séparé).

---

**Points de vigilance** :

- Ouvrir le lien email **sur le même appareil/contexte** que la demande — le
  token est lié au `user_id` (un lien valide ouvert ailleurs → refusé/redirigé).
- Un ancien email sans `?t=` (pré-déploiement) → l'appareil devient `$` pending
  au lieu de se connecter — approuver depuis un appareil connecté ou renvoyer
  un email.
- « Erreur lors du chargement des missions » juste après un enrôlement : toast
  transitoire possible (pool Supabase `max: 2` sous le burst de fetchs) — non
  bloquant, disparaît au refresh.
