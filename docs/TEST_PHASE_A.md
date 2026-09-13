# Protocole de test — Phase A (sécurité)

> Prérequis : l'app tourne en background (`bun dev` déjà lancé), un compte employé
> existant en statut `accepted` avec une boîte mail accessible, et **deux contextes
> navigateur distincts** :
>
> - fenêtre normale = **appareil A** (déjà connecté)
> - fenêtre privée = **appareil B** (nouvel appareil — cookies/localStorage séparés)

---

## Test 1 — Enrôlement nominal par email

1. Fenêtre privée → app → formulaire prestataire → renseigner **le même prénom + nom + email** (ou tél) que le compte existant → Valider.
2. **Attendu** : pas d'accès immédiat → toast « Un email de vérification a été envoyé… » → redirection `/waiting`.
3. Boîte mail → email reçu avec un lien de la forme `…/v2_<32 hex>?t=<exp>.<sig>`.
4. **Copier le lien et le coller dans la fenêtre privée** (crucial : le lien doit s'ouvrir sur l'appareil B — sur A il affichera « identifiant incorrect »).
5. **Attendu** : enrôlement → redirection Missions.
6. Côté appareil A : Paramètres > Appareils → l'id `v2_…` de B apparaît **en connecté** (pas de `$`, pas d'approbation requise).
7. En DB (`employees.id`) : le tableau contient le nouvel id `v2_…` en clair.

## Test 2 — Lien sans token / token falsifié (= le test « unauthorized »)

> Les server actions ne sont pas appelables directement depuis la console (il faut
> l'id d'action Next interne) — l'équivalent fonctionnel passe par la page `/[id]`,
> qui est le seul chemin public vers `enroll*Device`.

1. Reprendre le lien de l'email, **supprimer `?t=…`** → ouvrir dans la fenêtre privée.
2. **Attendu** : l'appareil n'est **pas** connecté (avant A.5, ce cas enrôlait silencieusement — c'était le trou).
3. Idem en modifiant un caractère du `t=` → même résultat.

## Test 3 — Membre connecté n'a pas besoin de token

1. Sur l'**appareil A** (déjà connecté), ouvrir `/<son propre user_id>` **sans** `?t` (l'id est visible dans Paramètres > Appareils ou le cookie `user_id`).
2. **Attendu** : pas d'erreur → Missions. Un membre gère ses appareils sans token.

## Test 4 — Rotation transparente des anciens ids

1. Si l'appareil A a encore un id legacy (format base36 court, sans `v2_`) : recharger l'app (F5).
2. **Attendu** : DevTools > Application > Cookies → `user_id` affiche `v2_<32 hex>` ; Paramètres > Appareils montre le nouvel id ; **aucune déconnexion**, aucun écran d'erreur.
3. F5 à répétition : l'id reste stable (rotation déterministe).
4. En DB : l'ancien id a été remplacé en place par le `v2_` dans `employees.id`.

## Test 5 — Fuite des `id[]` colmatée

1. Connecté sur A → DevTools > Network → recharger → trouver les requêtes POST server action (réponse RSC).
2. **Attendu** : seule **ta** ligne expose le tableau `id` complet ; toutes les autres lignes employees/conciergeries ont `id: []`.

## Test 6 — Demande d'accès en attente (`$` pending)

1. Fenêtre privée → formulaire prestataire avec un compte existant → la demande apparaît **sans email** dans Paramètres > Appareils de l'appareil A (badge « nouvel appareil »).
2. Sur A : cliquer l'icône de validation → l'appareil B devient connecté.
3. Côté B : au prochain chargement, session complète → accès à l'app.
4. **Attendu sécurité** : tant que B est `$`, ses appels aux actions sensibles (missions, homes, storage) sont rejetés — vérifier que B ne voit que la page d'attente.

## Test 7 — Limite d'appareils (si le compte a déjà 5 devices connectés)

1. Lien email valide sur B → modale « Limite d'appareils atteinte » avec l'id du plus ancien.
2. Continuer → B connecté, plus ancien évincé du tableau ; Annuler → rien n'est ajouté.

## Test 8 — Emails en local

- Si SMTP est configuré dans `.env.local` : l'email part réellement.
- Sinon : il tombe dans la file `failed_emails` (le retry cron le reprendra) — vérifiable en DB ou dans les logs du dev server ; le lien reste récupérable depuis le contenu du mail en file.

---

**Points de vigilance** :

- Ouvrir le lien email **sur le même appareil/contexte** que celui qui a demandé
  l'enrôlement — le token est lié au `user_id` de cet appareil (c'est voulu).
- Un ancien email sans `?t=` (envoyé avant le déploiement) échoue pour un
  non-membre — renvoyer un email depuis `/waiting`.
