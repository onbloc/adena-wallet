import { ChainRegistryImpl } from './registry';
import { ATOMONE_1, ATOMONE_CHAIN, ATOMONE_NETWORK_PROFILES } from './entries/atomone';
import { GNO_CHAIN, GNOLAND1, GNO_NETWORK_PROFILES } from './entries/gno';
import { CosmosNetworkProfile, GnoNetworkProfile } from './types';

describe('ChainRegistry', () => {
  let registry: ChainRegistryImpl;

  beforeEach(() => {
    registry = new ChainRegistryImpl();
    registry.registerChain(GNO_CHAIN);
    registry.registerChain(ATOMONE_CHAIN);
    [...GNO_NETWORK_PROFILES, ...ATOMONE_NETWORK_PROFILES].forEach((p) =>
      registry.registerNetworkProfile(p),
    );
  });

  // ── Chain API ────────────────────────────────────────────────────────

  it('getChain gno returns GNO_CHAIN with bech32Prefix g', () => {
    const chain = registry.getChain('gno');
    expect(chain).toBeDefined();
    expect(chain?.chainType).toBe('gno');
    expect(chain?.bech32Prefix).toBe('g');
    expect(chain?.coinType).toBe(118);
  });

  it('getChain atomone returns ATOMONE_CHAIN with bech32Prefix atone', () => {
    const chain = registry.getChain('atomone');
    expect(chain).toBeDefined();
    expect(chain?.chainType).toBe('cosmos');
    expect(chain?.bech32Prefix).toBe('atone');
    if (chain?.chainType === 'cosmos') {
      expect(chain.fee.model).toBe('feemarket');
    }
  });

  it('getChain nonexistent returns undefined', () => {
    expect(registry.getChain('nonexistent')).toBeUndefined();
  });

  it('listChains returns both chains', () => {
    expect(registry.listChains()).toHaveLength(2);
  });

  // ── NetworkProfile API ────────────────────────────────────────────────

  it('get gno profile returns correct profile', () => {
    const profile = registry.get('gnoland1');
    expect(profile).toBeDefined();
    expect(profile).toEqual(GNOLAND1);
    expect(profile?.chainType).toBe('gno');
  });

  it('get cosmos profile returns correct profile', () => {
    const profile = registry.get('atomone-1');
    expect(profile).toBeDefined();
    expect(profile).toEqual(ATOMONE_1);
    expect(profile?.chainType).toBe('cosmos');
  });

  it('get nonexistent id returns undefined', () => {
    expect(registry.get('nonexistent')).toBeUndefined();
  });

  it('list returns all registered profiles', () => {
    // 5 gno + 2 atomone (mainnet + testnet)
    expect(registry.list()).toHaveLength(7);
  });

  it('register overwrites existing profile with same id', () => {
    const updated: GnoNetworkProfile = { ...GNOLAND1, displayName: 'Updated Gno.land' };
    registry.register(updated);
    const profile = registry.get('gnoland1');
    expect(profile?.displayName).toBe('Updated Gno.land');
    expect(registry.list()).toHaveLength(7);
  });

  it('chainType discriminated union narrows NetworkProfile correctly', () => {
    const profile = registry.get('gnoland1');
    if (profile && profile.chainType === 'gno') {
      const gnoProfile: GnoNetworkProfile = profile;
      expect(gnoProfile.chainGroup).toBe('gno');
    }

    const cosmosProfile = registry.get('atomone-1');
    if (cosmosProfile && cosmosProfile.chainType === 'cosmos') {
      const typed: CosmosNetworkProfile = cosmosProfile;
      expect(typed.restEndpoints).toBeDefined();
    }
  });

  it('gnoland1 has chainGroup gno and isMainnet true', () => {
    const profile = registry.get('gnoland1');
    expect(profile?.chainGroup).toBe('gno');
    expect(profile?.isMainnet).toBe(true);
  });

  it('test12 has isMainnet false', () => {
    const profile = registry.get('test12');
    expect(profile?.isMainnet).toBe(false);
  });

  it('atomone-1 has chainGroup atomone and isMainnet true', () => {
    const profile = registry.get('atomone-1');
    expect(profile?.chainGroup).toBe('atomone');
    expect(profile?.isMainnet).toBe(true);
  });

  it('atomone-testnet-1 has isMainnet false', () => {
    const profile = registry.get('atomone-testnet-1');
    expect(profile).toBeDefined();
    expect(profile?.isMainnet).toBe(false);
    expect(profile?.chainId).toBe('atomone-testnet-1');
  });

  it('listByGroup gno returns 5 profiles', () => {
    expect(registry.listByGroup('gno')).toHaveLength(5);
  });

  it('listByGroup atomone returns 2 profiles (mainnet + testnet)', () => {
    expect(registry.listByGroup('atomone')).toHaveLength(2);
  });

  it('listByGroup nonexistent returns empty array', () => {
    expect(registry.listByGroup('nonexistent')).toHaveLength(0);
  });

  it('getDefault gno returns gnoland1 (isMainnet)', () => {
    expect(registry.getDefault('gno')?.id).toBe('gnoland1');
  });

  it('getDefault atomone returns atomone-1 (isMainnet)', () => {
    expect(registry.getDefault('atomone')?.id).toBe('atomone-1');
  });

  it('getDefault nonexistent returns undefined', () => {
    expect(registry.getDefault('nonexistent')).toBeUndefined();
  });

  // ── getNetworkProfileByChainId / getChainByChainId ──────────────────────

  it('getNetworkProfileByChainId finds gnoland1 profile by chainId', () => {
    const profile = registry.getNetworkProfileByChainId('gnoland1');
    expect(profile).toBeDefined();
    expect(profile?.id).toBe('gnoland1');
    expect(profile?.chainGroup).toBe('gno');
  });

  it('getNetworkProfileByChainId finds atomone-1 profile by chainId', () => {
    const profile = registry.getNetworkProfileByChainId('atomone-1');
    expect(profile).toBeDefined();
    expect(profile?.id).toBe('atomone-1');
    expect(profile?.chainGroup).toBe('atomone');
  });

  it('getNetworkProfileByChainId returns undefined for unknown chainId', () => {
    expect(registry.getNetworkProfileByChainId('unknown-chain')).toBeUndefined();
  });

  it('getChainByChainId resolves gno chain from chainId gnoland1', () => {
    const chain = registry.getChainByChainId('gnoland1');
    expect(chain).toBeDefined();
    expect(chain?.chainGroup).toBe('gno');
    expect(chain?.bech32Prefix).toBe('g');
  });

  it('getChainByChainId resolves atomone chain from chainId atomone-1', () => {
    const chain = registry.getChainByChainId('atomone-1');
    expect(chain).toBeDefined();
    expect(chain?.chainGroup).toBe('atomone');
    expect(chain?.bech32Prefix).toBe('atone');
  });

  it('getChainByChainId returns undefined for unknown chainId', () => {
    expect(registry.getChainByChainId('unknown')).toBeUndefined();
  });

  // ── Chain + Profile integration ──────────────────────────────────────

  it('can resolve bech32Prefix via Chain for any profile in the group', () => {
    const profile = registry.get('atomone-testnet-1');
    const chain = registry.getChain(profile!.chainGroup);
    expect(chain?.bech32Prefix).toBe('atone');
  });
});
