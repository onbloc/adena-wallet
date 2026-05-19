import { NetworkMetainfo } from '@types';
import {
  normalizeStoredId,
  pickDefaultByMode,
  resolveNetworkMode,
} from './network-default';

function makeNetwork(overrides: Partial<NetworkMetainfo> & Pick<NetworkMetainfo, 'id'>): NetworkMetainfo {
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
const TEST_13 = makeNetwork({ id: 'test-13', main: false });
const STAGING = makeNetwork({ id: 'staging', main: false });
const DEV = makeNetwork({ id: 'dev', main: false });
const NETWORKS: NetworkMetainfo[] = [GNOLAND1, TEST_13, STAGING, DEV];

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
    expect(normalizeStoredId('test-13')).toBe('test-13');
  });
});

describe('resolveNetworkMode', () => {
  it('uses explicit stored mode regardless of stored network', () => {
    expect(resolveNetworkMode('mainnet', 'test-13', NETWORKS)).toBe('mainnet');
    expect(resolveNetworkMode('testnet', 'gnoland1', NETWORKS)).toBe('testnet');
  });

  it('derives mode from the stored networks main flag when stored mode is missing', () => {
    expect(resolveNetworkMode(null, 'gnoland1', NETWORKS)).toBe('mainnet');
    expect(resolveNetworkMode(null, 'test-13', NETWORKS)).toBe('testnet');
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
  it('prefers test-13 for testnet mode', () => {
    expect(pickDefaultByMode(NETWORKS, 'testnet')?.id).toBe('test-13');
  });

  it('prefers gnoland1 for mainnet mode', () => {
    expect(pickDefaultByMode(NETWORKS, 'mainnet')?.id).toBe('gnoland1');
  });

  it('falls back to a generic testnet default when test-13 is missing', () => {
    const withoutTest13 = NETWORKS.filter((network) => network.id !== 'test-13');
    expect(pickDefaultByMode(withoutTest13, 'testnet')?.id).toBe('staging');
  });

  it('skips deleted networks when picking', () => {
    const withDeletedTest13 = NETWORKS.map((network) =>
      network.id === 'test-13' ? { ...network, deleted: true } : network,
    );
    expect(pickDefaultByMode(withDeletedTest13, 'testnet')?.id).toBe('staging');
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
