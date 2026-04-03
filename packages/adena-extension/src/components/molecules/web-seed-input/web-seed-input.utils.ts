import _ from 'lodash';

export function makeFilledSeedPhrase(seeds: string[], length: number): string[] {
  const filledArray = _.fill(Array(length), '');
  return [...seeds].concat(filledArray.slice(seeds.length)).slice(0, length);
}
