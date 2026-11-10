/**
 * Voortgang van Lucas, bewaard op de tablet (IndexedDB).
 */
import { get, set } from 'idb-keyval';
import type { Vaardigheid } from '../engine/adaptief';
import type { Herhaling } from '../engine/herhaling';
import type { Stats } from '../engine/overzicht';
import { FLITS_START, STANDAARD_KENT } from '../engine/generator-lucas';
import { SPELLEN, type HeldId, type SpelId, type VaardigheidId } from '../games/spellen';

export type { HeldId, SpelId, VaardigheidId };
/** Oude naam, nog gebruikt in de schermen. */
export type HeldinId = HeldId;

export type Sessie = {
  datum: string;
  held: HeldId;
  spel: SpelId;
  goed: number;
  totaal: number;
  ringen: number;
  seconden: number;
  auditie?: boolean;
};

/** Wat Lucas in de Turbo-winkel heeft: voorraad powerups, wat hij bezit en wat hij aan heeft staan. */
export type Winkel = {
  /** Powerups die hij nog kan gebruiken ("hart", "dubbel", "vuur"). */
  voorraad: Record<string, number>;
  /** Artikelen die hij voor altijd heeft (maatjes, ringen, feesten, werelden, helden). */
  bezit: string[];
  /** Per soort wat er aan staat ('' = standaard). */
  gekozen: { maatje: string; ring: string; feest: string; wereld: string; held: string };
  /** Hoeveel bliksems zijn er in totaal uitgegeven? */
  uitgegeven: number;
};

export type Voortgang = {
  versie: 1;
  ringen: number;
  /** Bliksemschichten: sparen voor de Turbo-winkel. */
  bliksems: number;
  /** Alle bliksems die hij ooit verdiend heeft. */
  bliksemsTotaal: number;
  winkel: Winkel;
  /** Turbokristallen verzameld met dagmissies (maximaal 7). */
  kristallen: number;
  /** Hoeveel dagmissies zijn er gespeeld? */
  missies: number;
  vaardigheden: Record<VaardigheidId, Vaardigheid>;
  /** Voor de flitsspellen: hoe lang het woord of de letter in beeld blijft (milliseconden). */
  flitstijd: number;
  sessies: Sessie[];
  /** Herhalingsdoosjes: sleutel ("som.3+4", "woord.kat", "ring.b") → doos. */
  herhaling: Herhaling;
  /** Is de auditie per spel al gedaan? */
  auditie: Record<VaardigheidId, boolean>;
  /** Voor het overzicht in de ouderhoek. */
  stats: Stats;
  instellingen: {
    /** De letters en lange klanken die Lucas kent ("m", "aa", …). */
    letters: string[];
    /** Na zoveel minuten volgt na de ronde een pauze (0 = geen grens). */
    sessieMinuten: number;
    /** Volledig scherm bij het starten (standaard uit: dan blijven de knoppen van de tablet zichtbaar). */
    volledigScherm: boolean;
    opgavenPerSessie: number;
    apparaatStem: string | null;
    effecten: boolean;
    /** Zachte achtergrondmuziek. */
    muziek: boolean;
  };
};

const perSpel = <T>(waarde: () => T) => Object.fromEntries(SPELLEN.map((s) => [s.id, waarde()])) as Record<SpelId, T>;

export function standaardVoortgang(): Voortgang {
  return {
    versie: 1,
    ringen: 0,
    bliksems: 0,
    bliksemsTotaal: 0,
    winkel: { voorraad: {}, bezit: [], gekozen: { maatje: '', ring: '', feest: '', wereld: '', held: '' }, uitgegeven: 0 },
    kristallen: 0,
    missies: 0,
    vaardigheden: perSpel(() => ({ niveau: 0, recent: [] as boolean[] })),
    flitstijd: FLITS_START,
    sessies: [],
    herhaling: {},
    auditie: perSpel(() => false),
    stats: { sommen: {}, verwisselingen: {} },
    instellingen: {
      letters: [...STANDAARD_KENT],
      sessieMinuten: 10,
      volledigScherm: false,
      // Een kleuter: korte rondes.
      opgavenPerSessie: 6,
      apparaatStem: null,
      effecten: true,
      muziek: true,
    },
  };
}

const SLEUTEL = 'voortgang';

export const vg: Voortgang = $state(standaardVoortgang());

/** Vul ontbrekende velden aan (bij een oudere versie of een import). */
function samenvoegen(basis: Voortgang, data: Partial<Voortgang>): Voortgang {
  return {
    ...basis,
    ...data,
    vaardigheden: { ...basis.vaardigheden, ...(data.vaardigheden ?? {}) },
    auditie: { ...basis.auditie, ...(data.auditie ?? {}) },
    stats: { ...basis.stats, ...(data.stats ?? {}) },
    winkel: {
      ...basis.winkel,
      ...(data.winkel ?? {}),
      voorraad: { ...(data.winkel?.voorraad ?? {}) },
      bezit: [...(data.winkel?.bezit ?? [])],
      gekozen: { ...basis.winkel.gekozen, ...(data.winkel?.gekozen ?? {}) },
    },
    instellingen: { ...basis.instellingen, ...(data.instellingen ?? {}) },
  };
}

export async function laadVoortgang() {
  try {
    const data = await get<Partial<Voortgang>>(SLEUTEL);
    if (data) Object.assign(vg, samenvoegen(standaardVoortgang(), data));
  } catch {
    // Opslag niet beschikbaar (bijv. privévenster): dan alleen voor deze keer.
  }
}

export async function bewaar() {
  try {
    await set(SLEUTEL, $state.snapshot(vg));
  } catch {
    // negeren
  }
}

export function exporteer(): string {
  return JSON.stringify($state.snapshot(vg), null, 2);
}

export async function importeer(json: string) {
  const data = JSON.parse(json) as Partial<Voortgang>;
  if (typeof data !== 'object' || data === null || !('vaardigheden' in data)) {
    throw new Error('Dit is geen back-up van Lucas’ Turbo Missie.');
  }
  Object.assign(vg, samenvoegen(standaardVoortgang(), data));
  await bewaar();
}

export async function wisAlles() {
  Object.assign(vg, standaardVoortgang());
  await bewaar();
}
