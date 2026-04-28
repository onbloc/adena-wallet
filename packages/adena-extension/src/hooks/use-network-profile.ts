import { useMemo } from 'react';
import { useRecoilValue } from 'recoil';

import { NetworkProfile } from 'adena-module';

import {
  toCosmosNetworkProfile,
  toGnoNetworkProfile,
} from '@common/mapper/network-profile-mapper';
import { NetworkState } from '@states';

/**
 * Return the NetworkProfile (endpoints, linkUrl, chainId, etc.) for the
 * currently selected network in the given chainGroup. Defaults to 'gno'.
 *
 * The source of truth remains the legacy per-chain Recoil atoms
 * (`currentNetwork` / `currentAtomoneNetwork`) because custom network
 * URL overrides are persisted there. This hook shapes those values into
 * the modern NetworkProfile discriminated union.
 *
 * Returns null when no network is selected for the requested chainGroup.
 */
export const useNetworkProfile = (chainGroup = 'gno'): NetworkProfile | null => {
  const currentGnoNetwork = useRecoilValue(NetworkState.currentNetwork);
  const currentAtomoneNetwork = useRecoilValue(NetworkState.currentAtomoneNetwork);

  return useMemo(() => {
    if (chainGroup === 'gno') {
      return currentGnoNetwork ? toGnoNetworkProfile(currentGnoNetwork) : null;
    }
    if (chainGroup === 'atomone') {
      return currentAtomoneNetwork ? toCosmosNetworkProfile(currentAtomoneNetwork) : null;
    }
    return null;
  }, [chainGroup, currentGnoNetwork, currentAtomoneNetwork]);
};
