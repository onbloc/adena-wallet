import {
  ATOMONE_CHAIN,
  ATOMONE_MAINNET,
  ATOMONE_NETWORK_PROFILES,
  GNO_CHAIN,
  GNO_MAINNET,
  GNO_NETWORK_PROFILES,
} from './__fixtures__/chains';
import { ChainRegistryImpl } from './registry';
import { CosmosNetworkProfile, GnoNetworkProfile } from './types';

const TOTAL_PROFILES = GNO_NETWORK_PROFILES.length + ATOMONE_NETWORK_PROFILES.length;

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
    const profile = registry.get('gno-mainnet');
    expect(profile).toBeDefined();
    expect(profile).toEqual(GNO_MAINNET);
    expect(profile?.chainType).toBe('gno');
  });

  it('get cosmos profile returns correct profile', () => {
    const profile = registry.get('atomone-mainnet');
    expect(profile).toBeDefined();
    expect(profile).toEqual(ATOMONE_MAINNET);
    expect(profile?.chainType).toBe('cosmos');
  });

  it('get nonexistent id returns undefined', () => {
    expect(registry.get('nonexistent')).toBeUndefined();
  });

  it('list returns all registered profiles', () => {

    expect(registry.list()).toHaveLength(TOTAL_PROFILES);
  });

  it('register overwrites existing profile with same id', () => {
    const updated: GnoNetworkProfile = { ...GNO_MAINNET, displayName: 'Updated Gno.land' };
    registry.register(updated);
    const profile = registry.get('gno-mainnet');
    expect(profile?.displayName).toBe('Updated Gno.land');
    expect(registry.list()).toHaveLength(TOTAL_PROFILES);
  });

  it('chainType discriminated union narrows NetworkProfile correctly', () => {
    const profile = registry.get('gno-mainnet');
    if (profile && profile.chainType === 'gno') {
      const gnoProfile: GnoNetworkProfile = profile;
      expect(gnoProfile.chainGroup).toBe('gno');
    }

    const cosmosProfile = registry.get('atomone-mainnet');
    if (cosmosProfile && cosmosProfile.chainType === 'cosmos') {
      const typed: CosmosNetworkProfile = cosmosProfile;
      expect(typed.restEndpoints).toBeDefined();
    }
  });

  it('gno-mainnet has chainGroup gno and isMainnet true', () => {
    const profile = registry.get('gno-mainnet');
    expect(profile?.chainGroup).toBe('gno');
    expect(profile?.isMainnet).toBe(true);
  });

  it('gno-testnet has isMainnet false', () => {
    const profile = registry.get('gno-testnet');
    expect(profile?.isMainnet).toBe(false);
  });

  it('atomone-mainnet has chainGroup atomone and isMainnet true', () => {
    const profile = registry.get('atomone-mainnet');
    expect(profile?.chainGroup).toBe('atomone');
    expect(profile?.isMainnet).toBe(true);
  });

  it('atomone-testnet has isMainnet false', () => {
    const profile = registry.get('atomone-testnet');
    expect(profile).toBeDefined();
    expect(profile?.isMainnet).toBe(false);
    expect(profile?.chainId).toBe('atomone-testnet');
  });

  it('listByGroup gno returns every gno profile', () => {
    expect(registry.listByGroup('gno')).toHaveLength(GNO_NETWORK_PROFILES.length);
  });

  it('listByGroup atomone returns 2 profiles (mainnet + testnet)', () => {
    expect(registry.listByGroup('atomone')).toHaveLength(ATOMONE_NETWORK_PROFILES.length);
  });

  it('listByGroup nonexistent returns empty array', () => {
    expect(registry.listByGroup('nonexistent')).toHaveLength(0);
  });

  it('getDefault gno returns gno-mainnet (isMainnet)', () => {
    expect(registry.getDefault('gno')?.id).toBe('gno-mainnet');
  });

  it('getDefault atomone returns atomone-mainnet (isMainnet)', () => {
    expect(registry.getDefault('atomone')?.id).toBe('atomone-mainnet');
  });

  it('getDefault nonexistent returns undefined', () => {
    expect(registry.getDefault('nonexistent')).toBeUndefined();
  });

  // ── getNetworkProfileByChainId / getChainByChainId ──────────────────────

  it('getNetworkProfileByChainId finds gno-mainnet profile by chainId', () => {
    const profile = registry.getNetworkProfileByChainId('gno-mainnet');
    expect(profile).toBeDefined();
    expect(profile?.id).toBe('gno-mainnet');
    expect(profile?.chainGroup).toBe('gno');
  });

  it('getNetworkProfileByChainId finds atomone-mainnet profile by chainId', () => {
    const profile = registry.getNetworkProfileByChainId('atomone-mainnet');
    expect(profile).toBeDefined();
    expect(profile?.id).toBe('atomone-mainnet');
    expect(profile?.chainGroup).toBe('atomone');
  });

  it('getNetworkProfileByChainId returns undefined for unknown chainId', () => {
    expect(registry.getNetworkProfileByChainId('unknown-chain')).toBeUndefined();
  });

  it('getChainByChainId resolves gno chain from chainId gno-mainnet', () => {
    const chain = registry.getChainByChainId('gno-mainnet');
    expect(chain).toBeDefined();
    expect(chain?.chainGroup).toBe('gno');
    expect(chain?.bech32Prefix).toBe('g');
  });

  it('getChainByChainId resolves atomone chain from chainId atomone-mainnet', () => {
    const chain = registry.getChainByChainId('atomone-mainnet');
    expect(chain).toBeDefined();
    expect(chain?.chainGroup).toBe('atomone');
    expect(chain?.bech32Prefix).toBe('atone');
  });

  it('getChainByChainId returns undefined for unknown chainId', () => {
    expect(registry.getChainByChainId('unknown')).toBeUndefined();
  });

  // ── Chain + Profile integration ──────────────────────────────────────

  it('can resolve bech32Prefix via Chain for any profile in the group', () => {
    const profile = registry.get('atomone-testnet');
    const chain = registry.getChain(profile!.chainGroup);
    expect(chain?.bech32Prefix).toBe('atone');
  });
});
