export function isSeedPhraseString(seedPhrase: string, length: number): boolean {
  if (!seedPhrase || typeof seedPhrase !== 'string') {
    return false;
  }

  const seeds = seedPhrase.split(' ');
  return seeds.length === length && seeds.every((seed) => seed.length > 0);
}
