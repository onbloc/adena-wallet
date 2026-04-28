import { hasMsgMintPhoton } from '../../cosmos/fee';
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
    feeCurrencyFilter: (msgs): string[] =>
      hasMsgMintPhoton(msgs)
        ? ['atomone-1:uatone', 'atomone-1:uphoton']
        : ['atomone-1:uphoton'],
    // Used only when the dynamic estimate (node config + simulate) fails.
    // Sized to cover atomone-1 mainnet's current min_gas_price of
    // 0.225 uphoton/gas: 0.225 × 200000 = 45_000 uphoton. Testnet currently
    // requires only 0.025 × 200000 = 5_000, so this overpays on testnet
    // but is safer than under-paying and bouncing off the node.
    fallbackFee: {
      amount: [{ denom: 'uphoton', amount: '45000' }],
      gas: '200000',
    },
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
