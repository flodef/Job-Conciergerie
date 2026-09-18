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

export const PLAN_ORDER: ConciergeriePlan[] = ['decouverte', 'pro', 'privilege'];

// Comparison table (settings "Comparatif" popup) — mirrors the landing pricing
// section. Keep in sync with the plan cards in app/(site)/landing/page.tsx.
export type FeatureValue = boolean | string;
export const FEATURE_MATRIX: { label: string; values: [FeatureValue, FeatureValue, FeatureValue] }[] = [
  { label: 'Biens gérés', values: ['20', 'Illimités', 'Illimités'] },
  { label: 'Prestataires', values: ['10', 'Illimités', 'Illimités'] },
  { label: 'Missions & calendrier', values: [true, true, true] },
  { label: 'Notifications email', values: [true, true, true] },
  { label: 'Mode binôme', values: [false, true, true] },
  { label: 'Comptes rendus photo', values: [false, true, true] },
  { label: 'Historique & statistiques', values: [false, true, true] },
  { label: 'Multi-conciergerie', values: [false, true, true] },
  { label: 'Notifications avancées', values: [false, true, true] },
  { label: 'Nouvelles fonctionnalités en avant-première', values: [false, false, true] },
  { label: "Demandes d'évolution prioritaires", values: [false, false, true] },
  { label: 'API & intégrations', values: [false, false, true] },
  { label: 'Formation en visio', values: [false, false, true] },
  { label: 'Personnalisation avancée', values: [false, false, true] },
  { label: 'Onboarding personnalisé', values: [false, false, true] },
  { label: 'Support', values: ['Email (48h)', 'Prioritaire (24h)', 'Dédié + SLA'] },
];
