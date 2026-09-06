# Branchement Revolut Pro — Guide complet

## Vue d'ensemble

La page de paiement utilise l'API Merchant de Revolut pour accepter les paiements (carte, Apple Pay, Google Pay, Pay by Bank).

**Flux de paiement :**

1. L'utilisateur clique sur **"S'abonner"** sur un plan tarifé → redirige vers `/checkout?plan=pro&billing=monthly`
2. La page checkout appelle `/api/create-order` (serveur) qui crée une commande via l'API Merchant Revolut
3. Revolut renvoie un **token** (identifiant public de la commande)
4. Le widget Revolut (`payWithPopup`) s'initialise avec ce token et affiche la popup de paiement
5. L'utilisateur paie → redirection vers `/checkout?status=success`
6. Le webhook `/api/revolut-webhook` reçoit la confirmation de paiement côté serveur

---

## Architecture des fichiers

```
app/
├── api/
│   ├── create-order/
│   │   └── route.ts          # Endpoint serveur : crée la commande Revolut
│   └── revolut-webhook/
│       └── route.ts          # Endpoint serveur : reçoit les webhooks Revolut
├── checkout/
│   └── page.tsx              # Page de paiement (widget Revolut côté client)
└── page.tsx                  # Landing page (boutons "S'abonner" → /checkout)
```

---

## Étape 1 — Récupérer les clés API Revolut

1. Se connecter sur **https://business.revolut.com**
2. Aller dans **Merchant** → **Settings** → **API Keys**
3. Générer deux clés :
   - **Secret Key** (`sk_...`) — utilisée uniquement côté serveur (jamais exposée au client)
   - **Public Key** (`pk_...`) — utilisée côté client pour initialiser le widget
4. Noter l'environnement : **Sandbox** pour les tests, **Production** pour le live

---

## Étape 2 — Configurer les variables d'environnement

### Fichier `.env.local` (développement local)

Créer ou éditer `.env.local` à la racine du projet :

```env
# Revolut Merchant API
REVOLUT_SECRET_KEY="sk_xxxxxxxxxxxxxxxxxxxxxxxx"
REVOLUT_PUBLIC_KEY="pk_xxxxxxxxxxxxxxxxxxxxxxxx"
REVOLUT_MODE="sandbox"

# URL publique de l'app (pour les redirections après paiement)
NEXT_PUBLIC_APP_URL="http://localhost:3001"
```

### Sur Vercel (production)

```bash
vercel env add REVOLUT_SECRET_KEY
vercel env add REVOLUT_PUBLIC_KEY
vercel env add REVOLUT_MODE
vercel env add NEXT_PUBLIC_APP_URL
```

**⚠️ Important :** Ne jamais commit le `.env.local` dans git (il est dans `.gitignore`).

---

## Étape 3 — Configurer le Webhook Revolut

Le webhook permet à Revolut de notifier ton serveur quand un paiement est confirmé, annulé, etc.

1. Aller sur **https://business.revolut.com** → **Merchant** → **Settings** → **Webhooks**
2. Ajouter l'URL du webhook :
   - **Sandbox** : `https://<ton-ngrok-ou-url-dev>/api/revolut-webhook`
   - **Production** : `https://job-conciergerie-landing.vercel.app/api/revolut-webhook`
3. Sélectionner les événements à écouter :
   - `ORDER_COMPLETED` — paiement réussi
   - `ORDER_AUTHORISED` — paiement autorisé (non capturé)
   - `ORDER_CANCELLED` — paiement annulé

### Sécurité du webhook (à implémenter)

Actuellement le webhook ne vérifie pas la signature. Pour la production, il faut :

1. Récupérer le header `Revolut-Signature` de la requête
2. Le comparer avec la signature calculée (HMAC SHA-256 du body avec la secret key)
3. Rejeter si la signature ne correspond pas

Exemple d'implémentation à ajouter dans `app/api/revolut-webhook/route.ts` :

```ts
import crypto from 'crypto';

function verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
```

---

## Étape 4 — Tester en Sandbox

### Cartes de test Revolut

Utiliser ces cartes pour tester en mode sandbox :

| Scénario | Numéro de carte | Résultat |
|----------|----------------|----------|
| Paiement réussi | `4111 1111 1111 1111` | Succès |
| Paiement refusé | `4111 1111 1111 1112` | Refusé |
| 3DS requis | `4111 1111 1111 1113` | Authentification 3DS |
| Fonds insuffisants | `4111 1111 1111 1114` | Insufficient funds |

- **Date d'expiration** : n'importe quelle date future (ex: `12/30`)
- **CVV** : n'importe quel code à 3 chiffres (ex: `123`)

### Test local

```bash
# 1. Démarrer le serveur
bun dev --port 3001

# 2. Aller sur la page de checkout
# http://localhost:3001/checkout?plan=pro&billing=monthly

# 3. La popup Revolut doit s'ouvrir
# 4. Utiliser une carte de test ci-dessus
# 5. Vérifier que la redirection vers ?status=success fonctionne
```

### Test avec webhook en local

Revolut ne peut pas atteindre `localhost`. Solutions :

1. **ngrok** : `ngrok http 3001` puis utiliser l'URL ngrok comme URL de webhook
2. **Vercel preview** : déployer une preview (`vercel`) et utiliser l'URL de preview

---

## Étape 5 — Passer en Production

1. Changer `REVOLUT_MODE` de `"sandbox"` à `"prod"` dans :
   - `.env.local` (local)
   - Variables d'environnement Vercel (production)

2. Dans `app/checkout/page.tsx`, ligne ~81 :
   ```ts
   // Avant (sandbox)
   const instance = await RevolutCheckout(orderToken, 'sandbox');

   // Après (prod) — utiliser la variable d'env
   const mode = process.env.NEXT_PUBLIC_REVOLUT_MODE || 'sandbox';
   const instance = await RevolutCheckout(orderToken, mode as 'prod' | 'sandbox');
   ```

3. Mettre à jour l'URL du webhook dans le dashboard Revolut avec l'URL de production

4. Redéployer : `bunx vercel --prod --yes`

---

## Détails techniques

### Endpoint `/api/create-order`

- **Méthode** : `POST`
- **Body** : `{ planName: string, amount: number, currency: string, customerEmail?: string }`
- **Réponse** : `{ token: string, orderId: string, checkoutUrl: string }`
- **Sécurité** : utilise `REVOLUT_SECRET_KEY` côté serveur uniquement

L'`amount` est multiplié par 100 (conversion en centimes) car l'API Revolut attend le montant dans la plus petite dénomination (cents pour EUR).

### Endpoint `/api/revolut-webhook`

- **Méthode** : `POST`
- **Source** : Revolut Merchant API
- **Événements gérés** :
  - `ORDER_COMPLETED` — le paiement est terminé avec succès
  - `ORDER_AUTHORISED` — le paiement est autorisé mais non capturé
  - `ORDER_CANCELLED` — le paiement a été annulé

### Page `/checkout`

- **URL** : `/checkout?plan=decouverte|pro|privilege&billing=monthly|annual`
- **URL succès** : `/checkout?status=success`
- **Widget** : utilise `payWithPopup` du SDK `@revolut/checkout`
- **SDK** : `@revolut/checkout` (installé via `bun add @revolut/checkout`)

### Plans tarifés

| Plan | Prix mensuel | Prix annuel | ID |
|------|-------------|-------------|-----|
| Découverte | 30€ | 300€ | `decouverte` |
| Pro | 50€ | 500€ | `pro` |
| Privilège | 100€ | 1000€ | `privilege` |

---

## Checklist de mise en production

- [ ] Clés API Revolut générées (production)
- [ ] `REVOLUT_SECRET_KEY` et `REVOLUT_PUBLIC_KEY` ajoutées sur Vercel
- [ ] `REVOLUT_MODE` = `"prod"` sur Vercel
- [ ] `NEXT_PUBLIC_APP_URL` = `https://job-conciergerie-landing.vercel.app` sur Vercel
- [ ] Webhook configuré dans le dashboard Revolut (URL de production)
- [ ] Vérification de signature du webhook implémentée
- [ ] Mode hardcoded `'sandbox'` remplacé par variable d'env dans `checkout/page.tsx`
- [ ] Test de paiement réussi en sandbox
- [ ] Test de paiement réussi en production
- [ ] Test du webhook (paiement → notification reçue)
- [ ] Redirection après paiement fonctionne

---

## Ressources

- [Documentation Revolut Merchant](https://developer.revolut.com/docs/api/merchant)
- [Guide Revolut Checkout Web](https://developer.revolut.com/docs/guides/merchant/accept-payments/online-payments/revolut-checkout/web)
- [SDK @revolut/checkout (npm)](https://www.npmjs.com/package/@revolut/checkout)
- [Dashboard Revolut Business](https://business.revolut.com)
