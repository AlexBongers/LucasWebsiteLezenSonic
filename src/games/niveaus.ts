/**
 * Wat elk niveau van elk spel oefent, voor de ouderhoek (de keuzelijst bij "Niveau").
 * Eén regel per niveau: er zijn er precies maxNiveau + 1 per spel (een test bewaakt dat).
 */
import type { SpelId } from './spellen';

export const NIVEAUS: Record<SpelId, string[]> = {
  ringrace: ['1 · letters kiezen uit drie', '2 · ook letters die op elkaar lijken (b en d)'],
  woordrace: ['1 · woordjes van drie klanken', '2 · woordjes van vier of meer klanken'],
  smash: ['1 · beginletter kiezen uit drie stenen', '2 · vier stenen, ook letters die op elkaar lijken'],
  bouwen: ['1 · woordjes van drie klanken leggen', '2 · vier of meer klanken, met stenen te veel'],
  katapult: ['1 · plus tot 6 (ook + 0)', '2 · plus tot 10, dubbelen, samen tien', '3 · min tot 10', '4 · plus en min door elkaar tot 10', '5 · tot 20 zonder over het tiental, tien erbij', '6 · over het tiental (8 + 5, 13 − 6)'],
  telbouw: ['1 · bouwen tot 10', '2 · tellen tot 10', '3 · bouwen tot 20', '4 · tellen tot 20'],
  meer: ['1 · ringen vergelijken tot 6', '2 · ringen tot 10, ook minder', '3 · getallen tot 20, groter en kleiner'],
  patroon: ['1 · AB en AAB', '2 · AAB, ABB, ABC en AABB', '3 · patronen van vier (ook ABCD en ABBA)'],
  splits: ['1 · bom tot 5', '2 · bom tot 10', '3 · bom tot 20'],
  tunnel: ['1 · letters die hij kent', '2 · ook de lastige letters'],
  tunnelsom: ['1 · plus tot 6 (ook + 0)', '2 · plus tot 10, dubbelen, samen tien', '3 · min tot 10', '4 · plus en min door elkaar', '5 · tot 20, tien erbij', '6 · over het tiental'],
  torensmash: ['1 · letters die hij kent', '2 · ook de lastige letters'],
  torenboem: ['1 · torens tot 10 blokken', '2 · torens tot 20 blokken'],
  patroonbaan: ['1 · AB en AAB', '2 · AAB, ABB, ABC en AABB', '3 · patronen van vier (ook ABCD en ABBA)'],
  bouwmuur: ['1 · woordjes van drie klanken leggen', '2 · vier of meer klanken, met blokken te veel'],
  bomsplits: ['1 · bom tot 5', '2 · bom tot 10', '3 · bom tot 20'],
  meer3d: ['1 · ringen vergelijken tot 6', '2 · ringen tot 10, ook minder', '3 · getallen tot 20, groter en kleiner'],
  woordrace3d: ['1 · woordjes van drie klanken', '2 · woordjes van vier of meer klanken'],
  rijm3d: ['1 · rijmen, andere plaatjes klinken anders', '2 · rijmen, andere plaatjes lijken erop'],
  getallenbaan: ['1 · tot 10: erna en ervoor', '2 · tot 20: ook een gat in de rij', '3 · tot 20: sprongen van 2 en terugtellen'],
  kluis: ['1 · groep 3: middelste klinker (k_t)', '2 · groep 3: elke plek, ook aa/oo/ie en b/d'],
  jacht3d: ['1 · zes blokken, drie gezocht', '2 · negen blokken, vier gezocht', '3 · negen blokken met lettervriendjes (b en d)'],
  jacht: ['1 · zes stenen, drie gezocht', '2 · negen stenen, vier gezocht', '3 · negen stenen met lettervriendjes (b en d)'],
};
