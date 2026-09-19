import type { Conciergerie } from '@/app/types/dataTypes';

/**
 * Product-generation gate. 'v3' unlocks new features; anything else —
 * 'v2', undefined, a stale row — stays locked (fail-closed on purpose).
 */
export const isV3 = (conciergerie: Pick<Conciergerie, 'version'> | null | undefined): boolean =>
  conciergerie?.version === 'v3';

/**
 * Server-side guard for v3-only mutations/queries. Call it before doing
 * any work — a client-side lock alone is never enough.
 */
export function requireV3(conciergerie: Pick<Conciergerie, 'version'> | null | undefined): void {
  if (!isV3(conciergerie)) throw new Error('Cette fonctionnalité nécessite la version 3.');
}
