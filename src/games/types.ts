import type { Gepland, Resultaat } from '../engine/sessie';
import type { SpelId } from './spellen';

export type SpelProps<T = unknown> = {
  /** Welk spel dit is (sommige spellen delen een component). */
  spel?: SpelId;
  /** Gouden ringen erbij; `bron` is de plek waar ze vandaan vliegen. */
  opRingen: (n: number, bron?: Element | null) => void;
  /** Voortgang van de ronde, 0 tot 1. */
  opVoortgang: (fractie: number) => void;
  /** Klaar; per opgave of die bij de eerste poging goed was. */
  opKlaar: (resultaten: Resultaat[]) => void;
  /** De geplande opgaven van deze ronde. */
  opgaven?: Gepland<T>[];
  /** Auditie: het eerste proefrondje. */
  auditie?: boolean;
  /** Niveau van deze ronde. */
  niveau?: number;
};
