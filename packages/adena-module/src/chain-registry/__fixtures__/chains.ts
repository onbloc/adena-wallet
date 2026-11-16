import { CosmosChain, CosmosNetworkProfile, GnoChain, GnoNetworkProfile } from '../types';

// Chain data now lives in the consuming app (adena-extension) and is injected
// into createChainRegistry(). These fixtures keep the registry's own tests
// independent of any real network's configuration.

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
    defaultFeeTokenId: 'test-mainnet:ufee',
    feeCurrencyFilter: (): string[] => ['test-mainnet:ufee'],
    fallbackFee: {
      amount: [{ denom: 'ufee', amount: '45000' }],
      gas: '200000',
    },
  },
  features: ['feemarket'],
};

const GNO_PROFILE_BASE = {
  chainType: 'gno' as const,
  chainGroup: 'gno' as const,
  chainIconUrl: '/assets/icons/gnoland.svg',
};

const ATOMONE_PROFILE_BASE = {
  chainType: 'cosmos' as const,
  chainGroup: 'atomone' as const,
  chainIconUrl: '/assets/icons/atone.svg',
};

export const GNO_MAINNET: GnoNetworkProfile = {
  ...GNO_PROFILE_BASE,
  id: 'gno-mainnet',
  chainId: 'gno-mainnet',
  displayName: 'Gno Mainnet',
  isMainnet: true,
  nativeTokenId: 'gno-mainnet:ugnot',
  rpcEndpoints: ['https://rpc.example.invalid:443'],
};

export const GNO_TESTNET: GnoNetworkProfile = {
  ...GNO_PROFILE_BASE,
  id: 'gno-testnet',
  chainId: 'gno-testnet',
  displayName: 'Gno Testnet',
  isMainnet: false,
  nativeTokenId: 'gno-testnet:ugnot',
  rpcEndpoints: ['https://testnet-rpc.example.invalid:443'],
};

export const ATOMONE_MAINNET: CosmosNetworkProfile = {
  ...ATOMONE_PROFILE_BASE,
  id: 'atomone-mainnet',
  chainId: 'atomone-mainnet',
  displayName: 'AtomOne Mainnet',
  isMainnet: true,
  nativeTokenId: 'atomone-mainnet:uatone',
  rpcEndpoints: ['https://atomone-rpc.example.invalid'],
  restEndpoints: ['https://atomone-api.example.invalid'],
};

export const ATOMONE_TESTNET: CosmosNetworkProfile = {
  ...ATOMONE_PROFILE_BASE,
  id: 'atomone-testnet',
  chainId: 'atomone-testnet',
  displayName: 'AtomOne Testnet',
  isMainnet: false,
  nativeTokenId: 'atomone-testnet:uatone',
  rpcEndpoints: ['https://atomone-testnet-rpc.example.invalid'],
  restEndpoints: ['https://atomone-testnet-api.example.invalid'],
};

export const GNO_NETWORK_PROFILES: GnoNetworkProfile[] = [GNO_MAINNET, GNO_TESTNET];

export const ATOMONE_NETWORK_PROFILES: CosmosNetworkProfile[] = [ATOMONE_MAINNET, ATOMONE_TESTNET];
