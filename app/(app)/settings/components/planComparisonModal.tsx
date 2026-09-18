'use client';

import { Button } from '@/app/components/button';
import FullScreenModal from '@/app/components/fullScreenModal';
import { FEATURE_MATRIX, PLAN_ORDER, PLANS } from '@/app/data/plans';
import type { ConciergeriePlan } from '@/app/types/dataTypes';
import { cn } from '@/app/utils/className';
import { IconCheck, IconX } from '@tabler/icons-react';

interface PlanComparisonModalProps {
  currentPlan: ConciergeriePlan;
  /** Set while a prepaid annual subscription is running — switches locked. */
  annualUntil?: Date | null;
  onClose: () => void;
  onSelect: (plan: ConciergeriePlan) => void;
}

/**
 * "Comparer les forfaits" popup — the FEATURE_MATRIX table (mirroring the
 * landing pricing section) with the current plan highlighted, plus one
 * button per other plan to switch to it.
 */
export default function PlanComparisonModal({ currentPlan, annualUntil, onClose, onSelect }: PlanComparisonModalProps) {
  return (
    <FullScreenModal title="Comparer les forfaits" onClose={onClose} disabled={false} footer={null}>
      <table className="w-full table-fixed text-sm border-collapse">
        <thead>
          <tr className="border-b border-secondary">
            <th className="text-left py-2 pr-2 font-semibold w-2/5" />
            {PLAN_ORDER.map(id => (
              <th key={id} className="text-center py-1 px-0.5 font-semibold">
                <span className={cn('block rounded-lg py-1', id === currentPlan && 'bg-primary/10 text-primary')}>
                  <span className="block text-xs font-bold leading-tight">{PLANS[id].name}</span>
                  <span className={cn('block text-xs font-normal', id !== currentPlan && 'text-foreground/60')}>
                    {PLANS[id].monthly} €/mois
                  </span>
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FEATURE_MATRIX.map(row => (
            <tr key={row.label} className="border-b border-secondary/50">
              <td className="py-1.5 pr-2 text-left text-xs">{row.label}</td>
              {row.values.map((v, i) => (
                <td key={i} className={cn('text-center py-1.5 px-1', PLAN_ORDER[i] === currentPlan && 'bg-primary/10')}>
                  {typeof v === 'string' ? (
                    <span className="text-xs">{v}</span>
                  ) : v ? (
                    <IconCheck size={18} stroke={3} className="inline text-green-600" />
                  ) : (
                    <IconX size={18} stroke={3} className="inline text-red-500" />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex flex-col gap-2 pt-2">
        {PLAN_ORDER.filter(id => id !== currentPlan).map(id => (
          <Button key={id} style="secondary" disabled={!!annualUntil} onClick={() => onSelect(id)}>
            Passer à {PLANS[id].name} — {PLANS[id].monthly} €/mois
          </Button>
        ))}
      </div>

      <p className="text-xs text-foreground/60 pt-1">
        {annualUntil
          ? `Forfait annuel en cours jusqu'au ${annualUntil.toLocaleDateString('fr-FR')} — un nouveau forfait pourra être choisi à cette date.`
          : 'Le changement est immédiat. Facturation mensuelle : le forfait le plus élevé utilisé dans le mois est celui facturé le 1er du mois suivant.'}
      </p>
    </FullScreenModal>
  );
}
