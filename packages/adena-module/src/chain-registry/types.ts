type GnoSignMode = 'gno-amino-json';
export type CosmosSignMode =
  | 'SIGN_MODE_DIRECT'
  | 'SIGN_MODE_LEGACY_AMINO_JSON';

// ─────────────────────────────────────────────────────────────────────
// Chain — chain-group-level definition (one entry per chainGroup).
// Holds values that are invariant across every network in the group
// (bech32Prefix, coinType, signing, etc.).
// ─────────────────────────────────────────────────────────────────────

export interface ChainBase {
  chainType: 'gno' | 'cosmos';
  chainGroup: string;
  bech32Prefix: string;
  coinType: 118;
}

export interface GnoChain extends ChainBase {
  chainType: 'gno';
  chainGroup: 'gno';
  bech32Prefix: 'g';
  signing: { modes: readonly GnoSignMode[]; preferred: GnoSignMode };
}

export interface CosmosChain extends ChainBase {
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

export type Chain = GnoChain | CosmosChain;

// ─────────────────────────────────────────────────────────────────────
// NetworkProfile — per-chainId endpoint profile (a chain can have many).
// Holds values that differ per network (chainId, rpcEndpoints, etc.).
// chainType is kept here so the discriminated union still narrows.
// ─────────────────────────────────────────────────────────────────────

export interface NetworkProfileBase {
  id: string;
  chainGroup: string;
  chainId: string;
  displayName: string;
  chainIconUrl: string;
  nativeTokenId: string;
  isMainnet: boolean;
  rpcEndpoints: string[];
  linkUrl?: string;
}

export interface GnoNetworkProfile extends NetworkProfileBase {
  chainType: 'gno';
  chainGroup: 'gno';
  indexerUrl?: string;
  apiUrl?: string;
  gnoUrl?: string;
}

export interface CosmosNetworkProfile extends NetworkProfileBase {
  chainType: 'cosmos';
  restEndpoints: string[];
}

export type NetworkProfile = GnoNetworkProfile | CosmosNetworkProfile;

// ─────────────────────────────────────────────────────────────────────
// Backward compatibility aliases
// Kept so existing imports of GnoChainProfile / CosmosChainProfile /
// ChainProfile continue to compile.
// TODO: remove when the network-switch UI task lands.
// ─────────────────────────────────────────────────────────────────────

/** @deprecated use NetworkProfileBase instead */
export type ChainProfileBase = NetworkProfileBase;
/** @deprecated use GnoNetworkProfile instead */
export type GnoChainProfile = GnoNetworkProfile;
/** @deprecated use CosmosNetworkProfile instead */
export type CosmosChainProfile = CosmosNetworkProfile;
/** @deprecated use NetworkProfile instead */
export type ChainProfile = NetworkProfile;

// ─────────────────────────────────────────────────────────────────────
// ChainRegistry interface
// ─────────────────────────────────────────────────────────────────────

export interface ChainRegistry {
  // Chain API (chain-group-level definition)
  registerChain(chain: Chain): void;
  getChain(chainGroup: string): Chain | undefined;
  listChains(): Chain[];

  // NetworkProfile API
  registerNetworkProfile(profile: NetworkProfile): void;
  getNetworkProfile(id: string): NetworkProfile | undefined;
  getNetworkProfileByChainId(chainId: string): NetworkProfile | undefined;
  getChainByChainId(chainId: string): Chain | undefined;
  listNetworkProfilesByChain(chainGroup: string): NetworkProfile[];
  getDefaultNetworkProfile(chainGroup: string): NetworkProfile | undefined;

  // Backward-compatible NetworkProfile API (keeps existing register/get/list/listByGroup/getDefault)
  register(profile: NetworkProfile): void;
  get(id: string): NetworkProfile | undefined;
  list(): NetworkProfile[];
  listByGroup(chainGroup: string): NetworkProfile[];
  getDefault(chainGroup: string): NetworkProfile | undefined;
}
