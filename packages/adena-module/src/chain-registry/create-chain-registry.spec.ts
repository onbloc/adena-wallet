import { createChainRegistry } from './create-chain-registry';

describe('createChainRegistry', () => {
  it('registers both Gno and AtomOne chains', () => {
    const registry = createChainRegistry();

    expect(registry.getChain('gno')).toBeDefined();
    expect(registry.getChain('atomone')).toBeDefined();
  });

  it('registers the mainnet network profiles', () => {
    const registry = createChainRegistry();

    expect(registry.get('gnoland1')).toBeDefined();
    expect(registry.get('atomone-1')).toBeDefined();
  });

  // Invariant: every registered profile must resolve to a Chain via its
  // chainGroup. This prevents regressions where a new NetworkProfile is
  // added without the matching registerChain() call.
  it('resolves a Chain for every registered network profile', () => {
    const registry = createChainRegistry();

    for (const profile of registry.list()) {
      expect(registry.getChain(profile.chainGroup)).toBeDefined();
    }
  });
});
