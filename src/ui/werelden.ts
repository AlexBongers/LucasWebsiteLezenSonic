import type { HeldId } from '../games/spellen';

/** Elke held heeft zijn eigen wereld met een eigen achtergrond. */
export type Wereld = 'heuvel' | 'werkplaats' | 'ruines';
export const WERELD_VAN: Record<HeldId, Wereld> = { sonic: 'heuvel', tails: 'werkplaats', knuckles: 'ruines' };
