import {
  CosmosNetworkProfile,
  GnoNetworkProfile,
} from 'adena-module';

import { AtomoneNetworkMetainfo, NetworkMetainfo } from '@types';

export function toGnoNetworkProfile(metainfo: NetworkMetainfo): GnoNetworkProfile {
  return {
    id: metainfo.id,
    chainType: 'gno',
    chainGroup: 'gno',
    chainId: metainfo.chainId,
    displayName: metainfo.chainName,
    chainIconUrl: '/assets/icons/gnoland.svg',
    nativeTokenId: `${metainfo.chainId}:ugnot`,
    isMainnet: metainfo.main === true,
    rpcEndpoints: [metainfo.rpcUrl],
    indexerUrl: metainfo.indexerUrl || undefined,
    apiUrl: metainfo.apiUrl || undefined,
    gnoUrl: metainfo.gnoUrl || undefined,
    linkUrl: metainfo.linkUrl || undefined,
  };
}

export function toCosmosNetworkProfile(
  metainfo: AtomoneNetworkMetainfo,
): CosmosNetworkProfile {
  return {
    id: metainfo.id,
    chainType: 'cosmos',
    chainGroup: 'atomone',
    chainId: metainfo.chainId,
    displayName: metainfo.chainName,
    chainIconUrl: '/assets/icons/atone.svg',
    nativeTokenId: `${metainfo.chainId}:uatone`,
    isMainnet: metainfo.isMainnet,
    rpcEndpoints: [metainfo.rpcUrl],
    restEndpoints: [metainfo.restUrl],
    linkUrl: metainfo.linkUrl,
  };
}
