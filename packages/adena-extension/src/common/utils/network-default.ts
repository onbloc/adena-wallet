import { NetworkModeValue } from '@repositories/common';
import { NetworkState } from '@states';
import { NetworkMetainfo } from '@types';

type NetworkMode = NetworkState.NetworkMode;

const PRIMARY_TESTNET_ID = 'test-13';
const PRIMARY_MAINNET_ID = 'gnoland1';

// StorageManager.get coerces undefined to the string "undefined" because it
// wraps the value with a template literal. Treat those sentinel strings, plus
// the empty string and falsy values, as "no stored id".
export function normalizeStoredId(raw: string | null | undefined): string | null {
  if (!raw || raw === 'undefined' || raw === 'null') {
    return null;
  }
  return raw;
}

// Derive the active network mode using the precedence:
// 1. Explicit stored mode wins.
// 2. If only a current network id is stored, derive mode from that network's
//    `main` flag so a user who has only ever used Mainnet stays on Mainnet
//    after ADN-780 changes the default for genuinely new installs.
// 3. With neither stored, treat as a fresh install and default to testnet.
export function resolveNetworkMode(
  storedMode: NetworkModeValue | null,
  storedCurrentId: string | null,
  networks: NetworkMetainfo[],
): NetworkMode {
  if (storedMode === 'mainnet' || storedMode === 'testnet') {
    return storedMode;
  }
  if (storedCurrentId) {
    const storedNetwork = networks.find((network) => network.id === storedCurrentId);
    if (storedNetwork) {
      return storedNetwork.main === true ? 'mainnet' : 'testnet';
    }
  }
  return 'testnet';
}

// Pick the default network for a given mode. Prefers the canonical id
// (test-13 for testnet, gnoland1 for mainnet) so the result is stable even if
// chains.json ordering changes, then falls back to any matching default, and
// finally to the first non-deleted network.
export function pickDefaultByMode(
  networks: NetworkMetainfo[],
  mode: NetworkMode,
): NetworkMetainfo | undefined {
  const wantsMainnet = mode === 'mainnet';
  const preferredId = wantsMainnet ? PRIMARY_MAINNET_ID : PRIMARY_TESTNET_ID;
  const preferred = networks.find(
    (network) => !network.deleted && network.id === preferredId,
  );
  if (preferred) {
    return preferred;
  }
  const generic = networks.find(
    (network) =>
      !network.deleted && (network.main === true) === wantsMainnet && network.default,
  );
  if (generic) {
    return generic;
  }
  return networks.find((network) => !network.deleted);
}
