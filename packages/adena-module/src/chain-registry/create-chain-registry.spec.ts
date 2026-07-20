import {
  ATOMONE_CHAIN,
  ATOMONE_NETWORK_PROFILES,
  GNO_CHAIN,
  GNO_NETWORK_PROFILES,
} from './__fixtures__/chains';
import { createChainRegistry } from './create-chain-registry';
import { ChainRegistry } from './types';

describe('createChainRegistry', () => {
  const makeRegistry = (): ChainRegistry =>
    createChainRegistry({
      chains: [GNO_CHAIN, ATOMONE_CHAIN],
      gnoNetworkProfiles: GNO_NETWORK_PROFILES,
      atomoneNetworkProfiles: ATOMONE_NETWORK_PROFILES,
    });

  it('registers both Gno and AtomOne chains', () => {
    const registry = makeRegistry();

    expect(registry.getChain('gno')).toBeDefined();
    expect(registry.getChain('atomone')).toBeDefined();
  });

  it('registers the mainnet network profiles', () => {
    const registry = makeRegistry();

    expect(registry.get('gno-mainnet')).toBeDefined();
    expect(registry.get('atomone-mainnet')).toBeDefined();
  });

  it('registers every provided network profile', () => {
    const registry = makeRegistry();

    expect(registry.list()).toHaveLength(
      GNO_NETWORK_PROFILES.length + ATOMONE_NETWORK_PROFILES.length,
    );
  });

  // Invariant: every registered profile must resolve to a Chain via its
  // chainGroup. This prevents regressions where a new NetworkProfile is
  // added without the matching registerChain() call.
  it('resolves a Chain for every registered network profile', () => {
    const registry = makeRegistry();

    for (const profile of registry.list()) {
      expect(registry.getChain(profile.chainGroup)).toBeDefined();
    }
  });
});
