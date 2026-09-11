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

const MAINNET = makeNetwork({ id: 'gnoland-1', main: true });
const STAGING = makeNetwork({ id: 'staging', main: false });
const DEV = makeNetwork({ id: 'dev', main: false });
const NETWORKS: NetworkMetainfo[] = [MAINNET, STAGING, DEV];

describe('normalizeStoredId', () => {
  it('returns null for empty / undefined / null / sentinel strings', () => {
    expect(normalizeStoredId('')).toBeNull();
    expect(normalizeStoredId(null)).toBeNull();
    expect(normalizeStoredId(undefined)).toBeNull();
    expect(normalizeStoredId('undefined')).toBeNull();
    expect(normalizeStoredId('null')).toBeNull();
  });

  it('returns the raw id for legitimate values', () => {
    expect(normalizeStoredId('gnoland-1')).toBe('gnoland-1');
    expect(normalizeStoredId('staging')).toBe('staging');
  });
});

describe('resolveNetworkMode', () => {
  it('uses explicit stored mode regardless of stored network', () => {
    expect(resolveNetworkMode('mainnet', 'staging', NETWORKS)).toBe('mainnet');
    expect(resolveNetworkMode('testnet', 'gnoland-1', NETWORKS)).toBe('testnet');
  });

  it('derives mode from the stored networks main flag when stored mode is missing', () => {
    expect(resolveNetworkMode(null, 'gnoland-1', NETWORKS)).toBe('mainnet');
    expect(resolveNetworkMode(null, 'staging', NETWORKS)).toBe('testnet');
    expect(resolveNetworkMode(null, 'dev', NETWORKS)).toBe('testnet');
  });

  it('defaults to mainnet for a fresh install (no stored values)', () => {
    expect(resolveNetworkMode(null, null, NETWORKS)).toBe('mainnet');
  });

  it('falls back to mainnet when the stored id does not match any known network', () => {
    expect(resolveNetworkMode(null, 'unknown-id', NETWORKS)).toBe('mainnet');
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

  it('prefers staging for testnet mode', () => {
    expect(pickDefaultByMode(NETWORKS, 'testnet')?.id).toBe('staging');
  });

  it('prefers gnoland-1 for mainnet mode', () => {
    expect(pickDefaultByMode(NETWORKS, 'mainnet')?.id).toBe('gnoland-1');
  });

  it('falls back to a generic testnet default when staging is missing', () => {
    const withoutStaging = NETWORKS.filter((network) => network.id !== 'staging');
    expect(pickDefaultByMode(withoutStaging, 'testnet')?.id).toBe('dev');
  });

  it('skips deleted networks when picking', () => {
    const withDeletedStaging = NETWORKS.map((network) =>
      network.id === 'staging' ? { ...network, deleted: true } : network,
    );
    expect(pickDefaultByMode(withDeletedStaging, 'testnet')?.id).toBe('dev');
  });

  it('returns the first non-deleted network when no testnet default exists', () => {
    const onlyMainnet: NetworkMetainfo[] = [MAINNET];
    expect(pickDefaultByMode(onlyMainnet, 'testnet')?.id).toBe('gnoland-1');
  });

  it('returns undefined when every network is deleted', () => {
    const allDeleted = NETWORKS.map((network) => ({ ...network, deleted: true }));
    expect(pickDefaultByMode(allDeleted, 'testnet')).toBeUndefined();
  });
});
