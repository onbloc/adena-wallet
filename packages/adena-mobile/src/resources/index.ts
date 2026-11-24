import { ChainFamily, NativeToken, Network } from '../domain/network';
import { LocalTokenIcon, Token, TokenType } from '../domain/token';
import exploreApps from './apps/apps.json';
import atomoneNetworks from './chains/atomone-networks.json';
import gnoNetworks from './chains/gno-networks.json';
import dexApis from './dex/dex-apis.json';
import grc20Registry from './tokens/grc20reg.json';
import nativeTokens from './tokens/native-tokens.json';
import priceBindings from './tokens/price-bindings.json';

// Typed, validated access to bundled resources. Nothing else imports the JSON files.

interface NativeTokenResource {
  id: string;
  family: ChainFamily;
  denom: string;
  name: string;
  symbol: string;
  decimals: number;
  icon?: LocalTokenIcon;
}

interface NetworkResource {
  id: string;
  family: ChainFamily;
  chainId: string;
  chainName: string;
  networkName: string;
  addressPrefix: string;
  rpcUrl: string;
  fallbackRpcUrl?: string;
  restUrl?: string;
  apiUrl?: string;
  linkUrl?: string;
  nativeTokenId: string;
  feeTokenId: string;
  defaultTokenIds: string[];
  fallbackGasPrice?: string;
  isMainnet: boolean;
}

export interface Grc20TransferEventConfig {
  type: string;
  tokenAttr: string;
  fromAttr: string;
  toAttr: string;
  valueAttr: string;
}

export interface Grc20RegistryConfig {
  helperPath: string;
  registries: { path: string }[];
  tokenPackages: { path: string; transferEvent: Grc20TransferEventConfig }[];
}

export interface PriceBinding {
  assetId: string;
  quoteDecimals?: number;
}

export interface PriceConfig {
  // Price feed shared by every priced network (all of them mainnets).
  sourceApiUrl: string;
  quoteCurrency: string;
  providerPriority: string[];
  pricedNetworkIds: string[];
  bindings: Record<string, PriceBinding>;
}

const assert = (condition: unknown, message: string): void => {
  if (!condition) {
    throw new Error(`Invalid bundled resource: ${message}`);
  }
};

const NATIVE_TOKENS = nativeTokens as NativeTokenResource[];

const findNativeToken = (id: string, family?: ChainFamily): NativeTokenResource => {
  const token = NATIVE_TOKENS.find(item => item.id === id && (!family || item.family === family));

  assert(token, `native token ${id} is not defined`);
  return token as NativeTokenResource;
};

const toNativeToken = (token: NativeTokenResource): NativeToken =>
  ({ id: token.id, symbol: token.symbol, denom: token.denom, decimals: token.decimals });

const toNetwork = (resource: NetworkResource): Network => {
  assert(/^https:\/\//.test(resource.rpcUrl), `${resource.id} rpcUrl must be https`);
  assert(resource.family !== ChainFamily.COSMOS || /^https:\/\//.test(resource.restUrl ?? ''), `${resource.id} restUrl must be https`);
  resource.defaultTokenIds.forEach(id => findNativeToken(id, resource.family));
  return {
    id: resource.id,
    family: resource.family,
    chainId: resource.chainId,
    chainName: resource.chainName,
    networkName: resource.networkName,
    addressPrefix: resource.addressPrefix,
    rpcUrl: resource.rpcUrl,
    fallbackRpcUrl: resource.fallbackRpcUrl || undefined,
    restUrl: resource.restUrl || undefined,
    apiUrl: resource.apiUrl || undefined,
    linkUrl: resource.linkUrl || undefined,
    nativeToken: toNativeToken(findNativeToken(resource.nativeTokenId, resource.family)),
    feeToken: toNativeToken(findNativeToken(resource.feeTokenId, resource.family)),
    defaultTokenIds: resource.defaultTokenIds,
    fallbackGasPrice: resource.fallbackGasPrice,
    isMainnet: resource.isMainnet,
    isCustom: false,
  };
};

export const BUILT_IN_NETWORKS: Network[] = [
  ...(gnoNetworks as NetworkResource[]),
  ...(atomoneNetworks as NetworkResource[]),
].map(toNetwork);

export const DEFAULT_NETWORK_ID = BUILT_IN_NETWORKS.find(network => network.isMainnet)?.id ?? BUILT_IN_NETWORKS[0].id;

const toToken = (native: NativeTokenResource, network: Network): Token => ({
  id: native.id,
  networkId: network.id,
  family: native.family,
  type: TokenType.NATIVE,
  name: native.name,
  symbol: native.symbol,
  decimals: native.decimals,
  denom: native.denom,
  localIcon: native.icon,
  isNative: true,
});

// Coins listed by default on a network (GNOT; ATONE and PHOTON).
export const getDefaultTokensFor = (network: Network): Token[] =>
  network.defaultTokenIds.map(id => toToken(findNativeToken(id, network.family), network));

export const getNativeTokenFor = (network: Network): Token => {
  const native = findNativeToken(network.nativeToken.id, network.family);

  return {
    id: native.id,
    networkId: network.id,
    family: native.family,
    type: TokenType.NATIVE,
    name: native.name,
    symbol: native.symbol,
    decimals: native.decimals,
    denom: native.denom,
    localIcon: native.icon,
    isNative: true,
  };
};

const GRC20_REGISTRY = grc20Registry as Record<string, Grc20RegistryConfig>;

export const getGrc20RegistryConfig = (chainId: string): Grc20RegistryConfig =>
  GRC20_REGISTRY[chainId] ?? GRC20_REGISTRY.default;

export const PRICE_CONFIG = priceBindings as PriceConfig;

export const DexProvider = {
  GNOSWAP: 'gnoswap',
} as const;

export type DexProvider = (typeof DexProvider)[keyof typeof DexProvider];

export interface DexApiConfig {
  provider: DexProvider;
  // Base URL without a trailing slash, e.g. https://gnoswap.io/api/v1.
  apiUrl: string;
}

// Market data (token metadata, prices, OHLCV) per network, keyed by network id.
export type DexApiConfigMap = Record<string, DexApiConfig>;

const toDexApiConfigMap = (resource: Record<string, DexApiConfig>): DexApiConfigMap =>
  Object.fromEntries(Object.entries(resource).map(([networkId, config]) => {
    assert(Object.values(DexProvider).includes(config.provider), `${networkId} dex provider ${config.provider} is not supported`);
    assert(/^https:\/\/[^/]+/.test(config.apiUrl), `${networkId} dex apiUrl must be https`);
    return [networkId, { provider: config.provider, apiUrl: config.apiUrl.replace(/\/+$/, '') }];
  }));

export const DEX_API_CONFIG: DexApiConfigMap = toDexApiConfigMap(dexApis as Record<string, DexApiConfig>);

export interface ExploreApp {
  id: string;
  name: string;
  description: string;
  logo: string;
  url: string;
  families: ChainFamily[];
  order: number;
}

export const EXPLORE_APPS: ExploreApp[] = (exploreApps as ExploreApp[])
  .filter(app => /^https:\/\//.test(app.url))
  .sort((a, b) => a.order - b.order);
