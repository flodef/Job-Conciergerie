import type { ConciergeriePlan } from '@/app/types/dataTypes';

export const PLAN_PRICES: Record<ConciergeriePlan, { monthly: number; annual: number }> = {
  decouverte: { monthly: 30, annual: 300 },
  pro: { monthly: 50, annual: 500 },
  privilege: { monthly: 100, annual: 1000 },
};
