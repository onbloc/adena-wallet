import { NetworkMetainfo } from '@types';
import { CosmosChain, CosmosNetworkProfile, GnoChain, GnoNetworkProfile } from 'adena-module';

export const MSG_MINT_PHOTON_TYPE_URL = '/atomone.photon.v1.MsgMintPhoton';

const defaultGnoNetworkProfileBase = {
  chainType: 'gno' as const,
  chainGroup: 'gno' as const,
  chainIconUrl: '/assets/icons/gnoland.svg',
};

const defaultAtomOneNetworkProfileBase = {
  chainType: 'cosmos' as const,
  chainGroup: 'atomone' as const,
  chainIconUrl: '/assets/icons/atone.svg',
};

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
    defaultFeeTokenId: 'atomone-1:uphoton',
    feeCurrencyFilter: (msgs: unknown[]): string[] =>
      hasMsgMintPhoton(msgs) ? ['atomone-1:uatone', 'atomone-1:uphoton'] : ['atomone-1:uphoton'],
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

function makeNativeTokenId(chainId: string): string {
  return `${chainId}:ugnot`;
}

export function makeGnoNetworkProfiles(resources: NetworkMetainfo[]): GnoNetworkProfile[] {
  return resources.map((resource) => {
    return {
      ...defaultGnoNetworkProfileBase,
      id: resource.id,
      chainId: resource.chainId,
      displayName: resource.networkName,
      isMainnet: resource.main ?? false,
      nativeTokenId: makeNativeTokenId(resource.chainId),
      rpcEndpoints: resource.rpcUrl ? [resource.rpcUrl] : [],
      indexerUrl: resource.indexerUrl,
      gnoUrl: resource.gnoUrl,
      apiUrl: resource.apiUrl,
      linkUrl: resource.linkUrl,
    };
  });
}

export function makeAtomOneNetworkProfiles(resources: NetworkMetainfo[]): CosmosNetworkProfile[] {
  return resources.map((resource) => {
    return {
      ...defaultAtomOneNetworkProfileBase,
      id: resource.id,
      chainId: resource.chainId,
      displayName: resource.networkName,
      isMainnet: resource.main ?? false,
      nativeTokenId: makeNativeTokenId(resource.chainId),
      rpcEndpoints: resource.rpcUrl ? [resource.rpcUrl] : [],
      restEndpoints: resource.apiUrl ? [resource.apiUrl] : [],
      linkUrl: resource.linkUrl,
    };
  });
}

/**
 * AtomOne allows ATONE (uatone) as a fee only when the tx includes a
 * `MsgMintPhoton` message (`x/photon`'s `tx_fee_exceptions` param). Every
 * other tx must pay in PHOTON (uphoton). This helper detects a MintPhoton
 * message regardless of whether it was produced by the AMINO or DIRECT
 * signing pipeline.
 *
 * - AMINO form:  { type: "cosmos-sdk/MsgMintPhoton" | "/atomone.photon.v1.MsgMintPhoton", value: ... }
 * - DIRECT form: { typeUrl: "/atomone.photon.v1.MsgMintPhoton", value: Uint8Array }
 */
export function isMsgMintPhoton(msg: unknown): boolean {
  if (!msg || typeof msg !== 'object') {
    return false;
  }
  const record = msg as Record<string, unknown>;
  const amino = record.type;
  if (typeof amino === 'string' && amino.includes('MsgMintPhoton')) {
    return true;
  }
  const direct = record.typeUrl;
  if (typeof direct === 'string' && direct.includes('MsgMintPhoton')) {
    return true;
  }
  return false;
}

export function hasMsgMintPhoton(msgs: unknown[]): boolean {
  return msgs.some(isMsgMintPhoton);
}
