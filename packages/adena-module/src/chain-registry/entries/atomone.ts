import { CosmosChain, CosmosNetworkProfile } from '../types';

export const ATOMONE_CHAIN: CosmosChain = {
  chainType: 'cosmos',
  chainGroup: 'atomone',
  bech32Prefix: 'atone',
  bech32ValPrefix: 'atonevaloper',
  coinType: 118,
  signing: {
    modes: ['SIGN_MODE_DIRECT', 'SIGN_MODE_LEGACY_AMINO_JSON'] as const,
    preferred: 'SIGN_MODE_DIRECT' as const,
  },
  fee: {
    model: 'feemarket' as const,
    defaultFeeTokenId: 'atomone-1:uphoton',
    feeCurrencyFilter: (): string[] => ['atomone-1:uphoton'],
  },
  features: ['feemarket', 'photon', 'gov-v1-3option'],
};

const ATOMONE_PROFILE_BASE = {
  chainType: 'cosmos' as const,
  chainGroup: 'atomone' as const,
  chainIconUrl: '/assets/icons/atone.svg',
};

export const ATOMONE_1: CosmosNetworkProfile = {
  ...ATOMONE_PROFILE_BASE,
  id: 'atomone-1',
  chainId: 'atomone-1',
  displayName: 'AtomOne',
  isMainnet: true,
  nativeTokenId: 'atomone-1:uatone',
  rpcEndpoints: ['https://atomone-rpc.allinbits.com'],
  restEndpoints: ['https://atomone-api.allinbits.com'],
  linkUrl: 'https://www.mintscan.io/atomone',
};

export const ATOMONE_TESTNET_1: CosmosNetworkProfile = {
  ...ATOMONE_PROFILE_BASE,
  id: 'atomone-testnet-1',
  chainId: 'atomone-testnet-1',
  displayName: 'AtomOne Testnet',
  isMainnet: false,
  nativeTokenId: 'atomone-testnet-1:uatone',
  rpcEndpoints: ['https://atomone-testnet-1-rpc.allinbits.services'],
  restEndpoints: ['https://atomone-testnet-1-api.allinbits.services'],
};

export const ATOMONE_NETWORK_PROFILES: CosmosNetworkProfile[] = [ATOMONE_1, ATOMONE_TESTNET_1];

/** @deprecated use ATOMONE_NETWORK_PROFILES instead */
export const ATOMONE_CHAINS = ATOMONE_NETWORK_PROFILES;
