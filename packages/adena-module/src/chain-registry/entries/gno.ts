import { GnoChainProfile } from '../types';

const GNO_BASE = {
  chainType: 'gno' as const,
  chainGroup: 'gno' as const,
  bech32Prefix: 'g' as const,
  coinType: 118 as const,
  signing: {
    modes: ['gno-amino-json'] as const,
    preferred: 'gno-amino-json' as const,
  },
};

export const GNOLAND1: GnoChainProfile = {
  ...GNO_BASE,
  id: 'gnoland1',
  chainId: 'gnoland1',
  displayName: 'Gno.land Beta Mainnet',
  isMainnet: true,
  chainIconUrl: '/assets/icons/gnoland.svg',
  nativeTokenId: 'gnoland1:ugnot',
  rpcEndpoints: ['https://rpc.betanet.testnets.gno.land:443'],
  indexerUrl: 'https://gnoland1.indexer.onbloc.xyz',
  gnoUrl: 'https://betanet.testnets.gno.land',
  apiUrl: 'https://gnoland1.api.onbloc.xyz',
  linkUrl: 'https://gnoscan.io',
};

export const GNO_STAGING: GnoChainProfile = {
  ...GNO_BASE,
  id: 'staging',
  chainId: 'staging',
  displayName: 'Gno.land Staging',
  isMainnet: false,
  chainIconUrl: '/assets/icons/gnoland.svg',
  nativeTokenId: 'staging:ugnot',
  rpcEndpoints: ['https://rpc.staging.gno.land:443'],
  indexerUrl: 'https://staging.indexer.onbloc.xyz',
  gnoUrl: 'https://staging.gno.land',
  apiUrl: 'https://staging.api.onbloc.xyz',
  linkUrl: 'https://gnoscan.io',
};

export const GNO_TEST12: GnoChainProfile = {
  ...GNO_BASE,
  id: 'test12',
  chainId: 'test12',
  displayName: 'Gno.land Testnet 12',
  isMainnet: false,
  chainIconUrl: '/assets/icons/gnoland.svg',
  nativeTokenId: 'test12:ugnot',
  rpcEndpoints: ['https://rpc.test12.testnets.gno.land:443'],
  indexerUrl: 'https://test12.indexer.onbloc.xyz',
  gnoUrl: 'https://test12.testnets.gno.land',
  linkUrl: 'https://gnoscan.io',
};

export const GNO_DEV: GnoChainProfile = {
  ...GNO_BASE,
  id: 'dev',
  chainId: 'dev',
  displayName: 'Gno.land Local',
  isMainnet: false,
  chainIconUrl: '/assets/icons/gnoland.svg',
  nativeTokenId: 'dev:ugnot',
  rpcEndpoints: ['http://127.0.0.1:26657'],
  gnoUrl: 'http://127.0.0.1:8888',
  linkUrl: 'http://127.0.0.1:3000',
};

export const GNO_GNOSWAP: GnoChainProfile = {
  ...GNO_BASE,
  id: 'gnoswap',
  chainId: 'dev.gnoswap',
  displayName: 'GnoSwap Dev',
  isMainnet: false,
  chainIconUrl: '/assets/icons/gnoland.svg',
  nativeTokenId: 'gnoswap:ugnot',
  rpcEndpoints: ['https://dev.rpc.gnoswap.io'],
  indexerUrl: 'https://indexer-gnoswap.in.onbloc.xyz',
  gnoUrl: 'https://gno.land',
  linkUrl: 'https://gnoscan.io',
};

export const GNO_CHAINS: GnoChainProfile[] = [
  GNOLAND1,
  GNO_STAGING,
  GNO_TEST12,
  GNO_DEV,
  GNO_GNOSWAP,
];
