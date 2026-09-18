import type { ConciergeriePlan } from '@/app/types/dataTypes';

// Single source of truth for plan names + prices — used by the landing pricing
// section, the settings select, checkout and the create-order API route.
export const PLANS: Record<ConciergeriePlan, { name: string; monthly: number; annual: number }> = {
  decouverte: { name: 'Découverte', monthly: 30, annual: 300 },
  pro: { name: 'Pro', monthly: 50, annual: 500 },
  privilege: { name: 'Privilège', monthly: 100, annual: 1000 },
};

// Feature gates advertised on the landing pricing section. `null` = unlimited.
// Enforced server-side in the actions layer; the client mirrors them for UX hints.
export interface PlanLimits {
  maxHomes: number | null;
  maxEmployees: number | null;
  duo: boolean;
  missionReports: boolean;
  history: boolean;
  advancedNotifications: boolean;
  // Multi-conciergerie: this conciergerie's open missions are visible to (and
  // claimable by) employees registered under OTHER conciergeries, and its
  // staff directory includes foreign accepted employees.
  multiConciergerie: boolean;
}

export const PLAN_LIMITS: Record<ConciergeriePlan, PlanLimits> = {
  decouverte: {
    maxHomes: 20,
    maxEmployees: 10,
    duo: false,
    missionReports: false,
    history: false,
    advancedNotifications: false,
    multiConciergerie: false,
  },
  pro: {
    maxHomes: null,
    maxEmployees: null,
    duo: true,
    missionReports: true,
    history: true,
    advancedNotifications: true,
    multiConciergerie: true,
  },
  privilege: {
    maxHomes: null,
    maxEmployees: null,
    duo: true,
    missionReports: true,
    history: true,
    advancedNotifications: true,
    multiConciergerie: true,
  },
};

// Rows without a plan column fall back to 'pro' — same default as formatConciergerie.
export const planLimits = (plan: ConciergeriePlan | undefined | null): PlanLimits => PLAN_LIMITS[plan ?? 'pro'];
