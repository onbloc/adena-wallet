import { CosmosNetworkProfile, TokenProfile } from 'adena-module';
import { AtomoneNetworkMetainfo } from '@types';

const ATOMONE_CHAIN_ICON_URL = '/assets/icons/atone.svg';
const PHOTON_ICON_URL = '/assets/icons/photon.svg';

export function atomoneNetworkToProfile(
  network: AtomoneNetworkMetainfo,
): CosmosNetworkProfile {
  return {
    id: network.id,
    chainType: 'cosmos',
    chainGroup: 'atomone',
    chainId: network.chainId,
    displayName: network.networkName,
    chainIconUrl: ATOMONE_CHAIN_ICON_URL,
    // Use the profile id (not chainId) so this matches the TokenProfile.id we
    // generate below — token-registry lookups are keyed off chainProfileId.
    nativeTokenId: `${network.id}:uatone`,
    isMainnet: network.isMainnet,
    rpcEndpoints: [network.rpcUrl],
    restEndpoints: [network.restUrl],
    linkUrl: network.linkUrl,
  };
}

// Native AtomOne tokens (ATONE + PHOTON) re-keyed onto the given network's id.
// Without these in the TokenRegistry, useTokenMetainfo skips seeding cosmos
// rows for custom networks and the wallet-main list stays empty, even though
// chainRegistry knows about the network.
export function atomoneNetworkToTokenProfiles(
  network: AtomoneNetworkMetainfo,
): TokenProfile[] {
  const chainProfileId = network.id;
  return [
    {
      id: `${chainProfileId}:uatone`,
      chainProfileId,
      symbol: 'ATONE',
      name: 'AtomOne',
      decimals: 6,
      iconUrl: ATOMONE_CHAIN_ICON_URL,
      origin: { kind: 'cosmos-native', denom: 'uatone' },
      tags: ['native', 'staking', 'governance'],
      priceId: network.isMainnet ? 'atomone' : undefined,
    },
    {
      id: `${chainProfileId}:uphoton`,
      chainProfileId,
      symbol: 'PHOTON',
      name: 'Photon',
      decimals: 6,
      iconUrl: PHOTON_ICON_URL,
      origin: { kind: 'cosmos-native', denom: 'uphoton' },
      tags: ['native', 'fee'],
      priceId: network.isMainnet ? 'photon' : undefined,
    },
  ];
}
