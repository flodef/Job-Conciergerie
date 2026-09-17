import type { ConciergeriePlan } from '@/app/types/dataTypes';

// Single source of truth for plan names + prices — used by the landing pricing
// section, the settings select, checkout and the create-order API route.
export const PLANS: Record<ConciergeriePlan, { name: string; monthly: number; annual: number }> = {
  decouverte: { name: 'Découverte', monthly: 30, annual: 300 },
  pro: { name: 'Pro', monthly: 50, annual: 500 },
  privilege: { name: 'Privilège', monthly: 100, annual: 1000 },
};
