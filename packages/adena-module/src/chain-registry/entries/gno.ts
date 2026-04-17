import { GnoChain, GnoNetworkProfile } from '../types';

export const GNO_CHAIN: GnoChain = {
  chainType: 'gno',
  chainGroup: 'gno',
  bech32Prefix: 'g',
  coinType: 118,
  signing: {
    modes: ['gno-amino-json'] as const,
    preferred: 'gno-amino-json' as const,
  },
};

const GNO_PROFILE_BASE = {
  chainType: 'gno' as const,
  chainGroup: 'gno' as const,
  chainIconUrl: '/assets/icons/gnoland.svg',
};

export const GNOLAND1: GnoNetworkProfile = {
  ...GNO_PROFILE_BASE,
  id: 'gnoland1',
  chainId: 'gnoland1',
  displayName: 'Gno.land Beta Mainnet',
  isMainnet: true,
  nativeTokenId: 'gnoland1:ugnot',
  rpcEndpoints: ['https://rpc.betanet.testnets.gno.land:443'],
  indexerUrl: 'https://gnoland1.indexer.onbloc.xyz',
  gnoUrl: 'https://betanet.testnets.gno.land',
  apiUrl: 'https://gnoland1.api.onbloc.xyz',
  linkUrl: 'https://gnoscan.io',
};

export const GNO_STAGING: GnoNetworkProfile = {
  ...GNO_PROFILE_BASE,
  id: 'staging',
  chainId: 'staging',
  displayName: 'Gno.land Staging',
  isMainnet: false,
  nativeTokenId: 'staging:ugnot',
  rpcEndpoints: ['https://rpc.staging.gno.land:443'],
  indexerUrl: 'https://staging.indexer.onbloc.xyz',
  gnoUrl: 'https://staging.gno.land',
  apiUrl: 'https://staging.api.onbloc.xyz',
  linkUrl: 'https://gnoscan.io',
};

export const GNO_TEST12: GnoNetworkProfile = {
  ...GNO_PROFILE_BASE,
  id: 'test12',
  chainId: 'test12',
  displayName: 'Gno.land Testnet 12',
  isMainnet: false,
  nativeTokenId: 'test12:ugnot',
  rpcEndpoints: ['https://rpc.test12.testnets.gno.land:443'],
  indexerUrl: 'https://test12.indexer.onbloc.xyz',
  gnoUrl: 'https://test12.testnets.gno.land',
  linkUrl: 'https://gnoscan.io',
};

export const GNO_DEV: GnoNetworkProfile = {
  ...GNO_PROFILE_BASE,
  id: 'dev',
  chainId: 'dev',
  displayName: 'Gno.land Local',
  isMainnet: false,
  nativeTokenId: 'dev:ugnot',
  rpcEndpoints: ['http://127.0.0.1:26657'],
  gnoUrl: 'http://127.0.0.1:8888',
  linkUrl: 'http://127.0.0.1:3000',
};

export const GNO_GNOSWAP: GnoNetworkProfile = {
  ...GNO_PROFILE_BASE,
  id: 'gnoswap',
  chainId: 'dev.gnoswap',
  displayName: 'GnoSwap Dev',
  isMainnet: false,
  nativeTokenId: 'gnoswap:ugnot',
  rpcEndpoints: ['https://dev.rpc.gnoswap.io'],
  indexerUrl: 'https://indexer-gnoswap.in.onbloc.xyz',
  gnoUrl: 'https://gno.land',
  linkUrl: 'https://gnoscan.io',
};

export const GNO_NETWORK_PROFILES: GnoNetworkProfile[] = [
  GNOLAND1,
  GNO_STAGING,
  GNO_TEST12,
  GNO_DEV,
  GNO_GNOSWAP,
];

/** @deprecated use GNO_NETWORK_PROFILES instead */
export const GNO_CHAINS = GNO_NETWORK_PROFILES;
