import ATOMONE_CHAIN_DATA from '@resources/chains/atomone-chains.json';
import GNO_CHAIN_DATA from '@resources/chains/chains.json';
import { createChainRegistry } from 'adena-module';
import { inferChainGroup } from './address-chain';
import {
  ATOMONE_CHAIN,
  GNO_CHAIN,
  makeAtomOneNetworkProfiles,
  makeGnoNetworkProfiles,
} from './chain-utils';

describe('inferChainGroup', () => {
  const registry = createChainRegistry({
    chains: [GNO_CHAIN, ATOMONE_CHAIN],
    gnoNetworkProfiles: makeGnoNetworkProfiles(GNO_CHAIN_DATA),
    atomoneNetworkProfiles: makeAtomOneNetworkProfiles(ATOMONE_CHAIN_DATA),
  });

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
