import { ChainRegistryImpl } from './registry';
import { ATOMONE_1, ATOMONE_CHAINS } from './entries/atomone';
import { GNOLAND1, GNO_CHAINS } from './entries/gno';
import { CosmosChainProfile, GnoChainProfile } from './types';

describe('ChainRegistry', () => {
  let registry: ChainRegistryImpl;

  beforeEach(() => {
    registry = new ChainRegistryImpl();
    [...GNO_CHAINS, ...ATOMONE_CHAINS].forEach((chain) => registry.register(chain));
  });

  it('get gno chain returns correct profile with chainType gno', () => {
    const profile = registry.get('gnoland1');
    expect(profile).toBeDefined();
    expect(profile).toEqual(GNOLAND1);
    expect(profile?.chainType).toBe('gno');
  });

  it('get cosmos chain returns correct profile with chainType cosmos', () => {
    const profile = registry.get('atomone-1');
    expect(profile).toBeDefined();
    expect(profile).toEqual(ATOMONE_1);
    expect(profile?.chainType).toBe('cosmos');
  });

  it('get nonexistent id returns undefined', () => {
    const profile = registry.get('nonexistent');
    expect(profile).toBeUndefined();
  });

  it('list returns all registered profiles', () => {
    const profiles = registry.list();
    expect(profiles).toHaveLength(6);
  });

  it('register overwrites existing profile with same id', () => {
    const updated: GnoChainProfile = { ...GNOLAND1, displayName: 'Updated Gno.land' };
    registry.register(updated);
    const profile = registry.get('gnoland1');
    expect(profile?.displayName).toBe('Updated Gno.land');
    expect(registry.list()).toHaveLength(6);
  });

  it('chainType discriminated union narrows type correctly', () => {
    const profile = registry.get('gnoland1');
    if (profile && profile.chainType === 'gno') {
      const gnoProfile: GnoChainProfile = profile;
      expect(gnoProfile.bech32Prefix).toBe('g');
    }

    const cosmosProfile = registry.get('atomone-1');
    if (cosmosProfile && cosmosProfile.chainType === 'cosmos') {
      const typed: CosmosChainProfile = cosmosProfile;
      expect(typed.fee.model).toBe('feemarket');
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

  it('listByGroup gno returns 5 profiles', () => {
    expect(registry.listByGroup('gno')).toHaveLength(5);
  });

  it('listByGroup atomone returns 1 profile', () => {
    expect(registry.listByGroup('atomone')).toHaveLength(1);
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
});
