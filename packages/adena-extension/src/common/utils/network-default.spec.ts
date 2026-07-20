import CHAIN_DATA from '@resources/chains/chains.json';
import { NetworkMetainfo } from '@types';
import {
  normalizeStoredId,
  pickDefaultByMode,
  PRIMARY_MAINNET_ID,
  PRIMARY_TESTNET_ID,
  resolveNetworkMode,
} from './network-default';

function makeNetwork(
  overrides: Partial<NetworkMetainfo> & Pick<NetworkMetainfo, 'id'>,
): NetworkMetainfo {
  return {
    default: true,
    main: false,
    chainId: overrides.id,
    chainName: overrides.id,
    networkId: overrides.id,
    networkName: overrides.id,
    addressPrefix: 'g',
    rpcUrl: '',
    indexerUrl: '',
    gnoUrl: '',
    apiUrl: '',
    linkUrl: '',
    deleted: false,
    ...overrides,
  } as NetworkMetainfo;
}

const GNOLAND1 = makeNetwork({ id: 'gnoland1', main: true });
const TOPAZ = makeNetwork({ id: 'topaz-1', main: false });
const STAGING = makeNetwork({ id: 'staging', main: false });
const DEV = makeNetwork({ id: 'dev', main: false });
const NETWORKS: NetworkMetainfo[] = [GNOLAND1, TOPAZ, STAGING, DEV];

describe('normalizeStoredId', () => {
  it('returns null for empty / undefined / null / sentinel strings', () => {
    expect(normalizeStoredId('')).toBeNull();
    expect(normalizeStoredId(null)).toBeNull();
    expect(normalizeStoredId(undefined)).toBeNull();
    expect(normalizeStoredId('undefined')).toBeNull();
    expect(normalizeStoredId('null')).toBeNull();
  });

  it('returns the raw id for legitimate values', () => {
    expect(normalizeStoredId('gnoland1')).toBe('gnoland1');
    expect(normalizeStoredId('topaz')).toBe('topaz');
  });
});

describe('resolveNetworkMode', () => {
  it('uses explicit stored mode regardless of stored network', () => {
    expect(resolveNetworkMode('mainnet', 'topaz', NETWORKS)).toBe('mainnet');
    expect(resolveNetworkMode('testnet', 'gnoland1', NETWORKS)).toBe('testnet');
  });

  it('derives mode from the stored networks main flag when stored mode is missing', () => {
    expect(resolveNetworkMode(null, 'gnoland1', NETWORKS)).toBe('mainnet');
    expect(resolveNetworkMode(null, 'topaz', NETWORKS)).toBe('testnet');
    expect(resolveNetworkMode(null, 'staging', NETWORKS)).toBe('testnet');
  });

  it('defaults to testnet for a fresh install (no stored values)', () => {
    expect(resolveNetworkMode(null, null, NETWORKS)).toBe('testnet');
  });

  it('falls back to testnet when the stored id does not match any known network', () => {
    expect(resolveNetworkMode(null, 'unknown-id', NETWORKS)).toBe('testnet');
  });
});

describe('pickDefaultByMode', () => {
  // The canonical ids are hardcoded in network-default.ts while the networks
  // themselves live in chains.json. If a network is renamed there without
  // updating the constant, the preferred lookup silently falls through to the
  // generic match, so assert both ids still exist in the shipped resource.
  it('keeps the canonical ids in sync with chains.json', () => {
    const ids = CHAIN_DATA.map((network) => network.id);
    expect(ids).toContain(PRIMARY_TESTNET_ID);
    expect(ids).toContain(PRIMARY_MAINNET_ID);
  });

  it('prefers topaz for testnet mode', () => {
    expect(pickDefaultByMode(NETWORKS, 'testnet')?.id).toBe('topaz-1');
  });

  it('prefers gnoland1 for mainnet mode', () => {
    expect(pickDefaultByMode(NETWORKS, 'mainnet')?.id).toBe('gnoland1');
  });

  it('falls back to a generic testnet default when topaz is missing', () => {
    const withoutTopaz = NETWORKS.filter((network) => network.id !== 'topaz-1');
    expect(pickDefaultByMode(withoutTopaz, 'testnet')?.id).toBe('staging');
  });

  it('skips deleted networks when picking', () => {
    const withDeletedTopaz = NETWORKS.map((network) =>
      network.id === 'topaz-1' ? { ...network, deleted: true } : network,
    );
    expect(pickDefaultByMode(withDeletedTopaz, 'testnet')?.id).toBe('staging');
  });

  it('returns the first non-deleted network when no testnet default exists', () => {
    const onlyMainnet: NetworkMetainfo[] = [GNOLAND1];
    expect(pickDefaultByMode(onlyMainnet, 'testnet')?.id).toBe('gnoland1');
  });

  it('returns undefined when every network is deleted', () => {
    const allDeleted = NETWORKS.map((network) => ({ ...network, deleted: true }));
    expect(pickDefaultByMode(allDeleted, 'testnet')).toBeUndefined();
  });
});
