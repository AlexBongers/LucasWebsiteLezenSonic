/** Drie keuzes voor drie banen of poorten: altijd met het goede antwoord erbij, in de oude volgorde. */
export function drieKeuzes<T>(keuzes: readonly T[], goed: T): T[] {
  const af = keuzes.filter((k) => k !== goed).slice(0, 2);
  return keuzes.filter((k) => k === goed || af.includes(k));
}
