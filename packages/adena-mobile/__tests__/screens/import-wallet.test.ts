import {
  fillWords,
  normalizeMnemonic,
} from '../../src/screens/onboarding/ImportWalletScreen';

const empty = (n: number) => Array<string>(n).fill('');

describe('fillWords', () => {
  it('puts a single typed word into its own cell', () => {
    expect(fillWords(empty(3), 1, ' word ')).toEqual(['', 'word', '']);
  });

  it('spreads a pasted phrase from the cell it was pasted into', () => {
    expect(fillWords(empty(4), 1, 'alpha beta\ngamma')).toEqual([
      '',
      'alpha',
      'beta',
      'gamma',
    ]);
  });

  it('drops words that do not fit', () => {
    expect(fillWords(empty(2), 1, 'alpha beta gamma')).toEqual(['', 'alpha']);
  });

  it('round-trips through normalizeMnemonic', () => {
    const words = fillWords(empty(3), 0, 'Alpha  BETA gamma');
    expect(normalizeMnemonic(words.join(' '))).toBe('alpha beta gamma');
  });
});
