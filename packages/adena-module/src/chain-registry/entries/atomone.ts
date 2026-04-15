import { CosmosChainProfile } from '../types';

const ATOMONE_BASE = {
  chainType: 'cosmos' as const,
  chainGroup: 'atomone' as const,
  bech32Prefix: 'atone' as const,
  bech32ValPrefix: 'atonevaloper',
  coinType: 118 as const,
  chainIconUrl: '/assets/icons/atone.svg',
  signing: {
    modes: ['SIGN_MODE_DIRECT', 'SIGN_MODE_LEGACY_AMINO_JSON'] as const,
    preferred: 'SIGN_MODE_DIRECT' as const,
  },
  fee: {
    model: 'feemarket' as const,
    defaultFeeTokenId: 'atomone-1:uphoton',
    feeCurrencyFilter: (): string[] => ['atomone-1:uphoton'],
  },
  features: ['feemarket', 'photon', 'gov-v1-3option'] as ('feemarket' | 'photon' | 'gov-v1-3option' | 'ibc-go-v7+')[],
};

export const ATOMONE_1: CosmosChainProfile = {
  ...ATOMONE_BASE,
  id: 'atomone-1',
  chainId: 'atomone-1',
  displayName: 'AtomOne',
  isMainnet: true,
  nativeTokenId: 'atomone-1:uatone',
  rpcEndpoints: ['https://atomone-rpc.allinbits.com'],
  restEndpoints: ['https://atomone-api.allinbits.com'],
  linkUrl: 'https://www.mintscan.io/atomone',
};

export const ATOMONE_CHAINS: CosmosChainProfile[] = [ATOMONE_1];
