import { createChainRegistry } from 'adena-module';
import { inferChainGroup } from './address-chain';

describe('inferChainGroup', () => {
  const registry = createChainRegistry();

  it('returns "gno" for a gno bech32 address (g1...)', () => {
    expect(inferChainGroup('g1abc1234567890abcdefghijklmnopqr', registry)).toBe('gno');
  });

  it('returns "atomone" for an atomone bech32 address (atone1...)', () => {
    expect(inferChainGroup('atone1abc1234567890abcdefghijklmnopqrstuvwx', registry)).toBe(
      'atomone',
    );
  });

  it('falls back to "gno" for an unknown chain prefix', () => {
    expect(inferChainGroup('cosmos1abc1234567890abcdefghijklmnopqrstuvwx', registry)).toBe('gno');
  });

  it('falls back to "gno" for an empty string', () => {
    expect(inferChainGroup('', registry)).toBe('gno');
  });

  it('falls back to "gno" for partial input that has not reached a separator yet', () => {
    expect(inferChainGroup('at', registry)).toBe('gno');
    expect(inferChainGroup('atone', registry)).toBe('gno');
  });
});
