type ChainType = 'gno' | 'cosmos';
type GnoSignMode = 'gno-amino-json';
type CosmosSignMode = 'SIGN_MODE_DIRECT' | 'SIGN_MODE_LEGACY_AMINO_JSON';

export interface ChainProfileBase {
  chainType: ChainType;
  chainGroup: string; // 'gno' | 'atomone' — permission isolation, meta grouping
  id: string;
  chainId: string;
  displayName: string;
  chainIconUrl: string;
  nativeTokenId: string;
  coinType: 118;
  bech32Prefix: string;
  isMainnet: boolean;
  rpcEndpoints: string[];
  restEndpoints?: string[];
  linkUrl?: string;
}

export interface GnoChainProfile extends ChainProfileBase {
  chainType: 'gno';
  chainGroup: 'gno';
  bech32Prefix: 'g';
  signing: { modes: readonly GnoSignMode[]; preferred: GnoSignMode };
  indexerUrl?: string;
  apiUrl?: string;
  gnoUrl?: string;
}

export interface CosmosChainProfile extends ChainProfileBase {
  chainType: 'cosmos';
  bech32ValPrefix?: string;
  signing: { modes: readonly CosmosSignMode[]; preferred: CosmosSignMode };
  fee: {
    model: 'static' | 'feemarket';
    defaultFeeTokenId: string;
    feeCurrencyFilter?: (msgs: unknown[]) => string[];
  };
  features: ('feemarket' | 'photon' | 'gov-v1-3option' | 'ibc-go-v7+')[];
}

export type ChainProfile = GnoChainProfile | CosmosChainProfile;

export interface ChainRegistry {
  register(profile: ChainProfile): void;
  get(id: string): ChainProfile | undefined;
  list(): ChainProfile[];
  listByGroup(chainGroup: string): ChainProfile[];
  getDefault(chainGroup: string): ChainProfile | undefined;
}
