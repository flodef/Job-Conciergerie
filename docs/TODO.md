# À faire

Relié au plan d'évolution SaaS : voir `PLAN_SAAS.md` (notamment la future table `clients` avec `plan`).

## Abonnements / Forfaits

- [ ] **Permettre le changement de forfait** depuis les paramètres conciergerie.
  Aujourd'hui le champ `conciergeries.plan` est affiché en lecture seule
  (`Select` désactivé dans `conciergerieSettings.tsx`). Rendre éditable une fois
  la facturation / les règles de transition décidées.
- [ ] **Enforcer les conditions de chaque forfait** côté serveur (jamais seulement
  côté client). Limites à définir et appliquer, par exemple :
  - Découverte : **20 logements maximum** (`homes`)
  - Découverte : quotas missions / prestataires à préciser
  - Pro / Privilège : limites éventuelles à préciser
  - Bloquer ou avertir à la création quand la limite est atteinte, avec un
    message proposant le passage au forfait supérieur.
- [ ] Prévoir la migration vers la table `clients` (Phase SaaS) : `plan` devra
  vivre côté `clients`, pas `conciergeries` — prévoir le transfert.
