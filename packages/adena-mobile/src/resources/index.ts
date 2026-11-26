import { ChainFamily, NativeToken, Network } from '../domain/network';
import { LocalTokenIcon, Token, TokenType } from '../domain/token';
import { derivePackageAddress } from '../utils/address';
import atomoneNetworks from './chains/atomone-networks.json';
import gnoNetworks from './chains/gno-networks.json';
import dexApis from './dex/dex-apis.json';
import onrampProviders from './onramp/onramp-providers.json';
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

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

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

// GnoSwap contracts used to build swap transactions; validated so nothing is hardcoded in code.
export interface DexSwapConfig {
  // Router proxy realm that exposes ExactInSwapRoute / DrySwapRoute.
  routerPath: string;
  // Router realm address, the GRC20 approve spender (checked against routerPath).
  routerAddress: string;
  // Native coin wrapper the router trades instead of the coin itself.
  wrappedNative: { denom: string; tokenPath: string; packagePath: string; minDeposit: string };
  feeTiers: number[];
  // Native amount kept back by the Max chip for the network fee and storage deposit.
  nativeFeeReserve: string;
  // Token ids offered as quick picks in the token selector.
  popularTokens: string[];
}

// GnoSwap order protocol realms (gnoswap-labs/gnoswap-order-protocol): escrowed DCA and limit orders run by GnoSwap keepers.
export interface DexOrderConfig {
  dcaPath: string;
  limitPath: string;
  // Pool whitelist shared by both, queried per target ("dca" / "limit").
  whitelistPath: string;
}

export interface DexApiConfig {
  provider: DexProvider;
  // Base URL without a trailing slash, e.g. https://api.gnoswap.io/v1.
  apiUrl: string;
  // GRC20 carrying the market for a native denom, used when the token meta is unavailable.
  wrappedPaths?: Record<string, string>;
  // Absent on networks where swaps are not offered.
  swap?: DexSwapConfig;
  // Absent on networks without the order protocol; needs `swap` for its token list and wrapped native coin.
  orders?: DexOrderConfig;
}

// Market data (token metadata, prices, OHLCV) and swap contracts per network, keyed by network id.
export type DexApiConfigMap = Record<string, DexApiConfig>;

const SEGMENT = '[a-z0-9_][a-z0-9_-]*';
const REALM_PATH = new RegExp(`^gno\\.land/r/${SEGMENT}(/${SEGMENT})*$`);
// GRC20 registry key "{realmPath}.{symbol}".
const TOKEN_PATH = new RegExp(`^gno\\.land/r/${SEGMENT}(/${SEGMENT})*\\.[A-Za-z0-9_]+$`);

export const isRealmPath = (value: unknown): value is string => typeof value === 'string' && REALM_PATH.test(value);

export const isTokenPath = (value: unknown): value is string => typeof value === 'string' && TOKEN_PATH.test(value);

const toDexSwapConfig = (networkId: string, resource: unknown): DexSwapConfig | undefined => {
  if (resource === undefined) {
    return undefined;
  }

  const swap = (resource ?? {}) as Partial<DexSwapConfig>;
  const wrapped = (swap.wrappedNative ?? {}) as Partial<DexSwapConfig['wrappedNative']>;

  assert(isRealmPath(swap.routerPath), `${networkId} swap routerPath must be a realm path`);
  assert(swap.routerAddress === derivePackageAddress(swap.routerPath as string), `${networkId} swap routerAddress must be the routerPath realm address`);
  assert(isNonEmptyString(wrapped.denom), `${networkId} swap wrappedNative.denom is required`);
  assert(isRealmPath(wrapped.packagePath), `${networkId} swap wrappedNative.packagePath must be a realm path`);
  assert(isTokenPath(wrapped.tokenPath) && (wrapped.tokenPath as string).startsWith(`${wrapped.packagePath}.`), `${networkId} swap wrappedNative.tokenPath must belong to its package`);
  assert(/^\d+$/.test(wrapped.minDeposit ?? ''), `${networkId} swap wrappedNative.minDeposit must be an integer`);
  assert(Array.isArray(swap.feeTiers) && swap.feeTiers.length > 0 && swap.feeTiers.every(fee => Number.isInteger(fee) && fee > 0 && fee < 1_000_000), `${networkId} swap feeTiers must be positive integers`);
  assert(/^\d+$/.test(swap.nativeFeeReserve ?? ''), `${networkId} swap nativeFeeReserve must be an integer`);
  assert(Array.isArray(swap.popularTokens) && swap.popularTokens.every(id => id === wrapped.denom || isTokenPath(id)), `${networkId} swap popularTokens must be token ids`);

  return {
    routerPath: swap.routerPath as string,
    routerAddress: swap.routerAddress as string,
    wrappedNative: { denom: wrapped.denom as string, tokenPath: wrapped.tokenPath as string, packagePath: wrapped.packagePath as string, minDeposit: wrapped.minDeposit as string },
    feeTiers: [...(swap.feeTiers as number[])],
    nativeFeeReserve: swap.nativeFeeReserve as string,
    popularTokens: [...(swap.popularTokens as string[])],
  };
};

const toDexOrderConfig = (networkId: string, resource: unknown, swap: DexSwapConfig | undefined): DexOrderConfig | undefined => {
  if (resource === undefined) {
    return undefined;
  }

  const orders = (resource ?? {}) as Partial<DexOrderConfig>;

  assert(swap !== undefined, `${networkId} orders need swap metadata`);
  assert(isRealmPath(orders.dcaPath), `${networkId} orders dcaPath must be a realm path`);
  assert(isRealmPath(orders.limitPath), `${networkId} orders limitPath must be a realm path`);
  assert(isRealmPath(orders.whitelistPath), `${networkId} orders whitelistPath must be a realm path`);

  return { dcaPath: orders.dcaPath as string, limitPath: orders.limitPath as string, whitelistPath: orders.whitelistPath as string };
};

export const toDexApiConfigMap = (resource: Record<string, unknown>): DexApiConfigMap =>
  Object.fromEntries(Object.entries(resource).map(([networkId, raw]) => {
    const config = (raw ?? {}) as Partial<DexApiConfig>;

    assert(Object.values(DexProvider).includes(config.provider as DexProvider), `${networkId} dex provider ${config.provider} is not supported`);
    assert(/^https:\/\/[^/]+/.test(config.apiUrl ?? ''), `${networkId} dex apiUrl must be https`);
    Object.entries(config.wrappedPaths ?? {}).forEach(([denom, path]) =>
      assert(isNonEmptyString(denom) && isNonEmptyString(path), `${networkId} dex wrappedPaths must map denoms to paths`));
    const swap = toDexSwapConfig(networkId, config.swap);
    const orders = toDexOrderConfig(networkId, config.orders, swap);

    return [networkId, {
      provider: config.provider as DexProvider,
      apiUrl: (config.apiUrl as string).replace(/\/+$/, ''),
      wrappedPaths: config.wrappedPaths,
      ...(swap ? { swap } : {}),
      ...(orders ? { orders } : {}),
    }];
  }));

export const DEX_API_CONFIG: DexApiConfigMap = toDexApiConfigMap(dexApis as Record<string, unknown>);

// URL template placeholders an onramp provider may use; values are URL-encoded on substitution.
export const ONRAMP_PLACEHOLDERS = ['address', 'amount', 'currency', 'asset'] as const;

export type OnrampPlaceholder = (typeof ONRAMP_PLACEHOLDERS)[number];

export interface OnrampProvider {
  id: string;
  name: string;
  paymentMethods: string[];
  // e.g. "https://buy.example/?wallet={address}&amount={amount}&fiat={currency}&asset={asset}".
  urlTemplate: string;
  // Provider asset code keyed by "<networkId>:<tokenId>".
  assets: Record<string, string>;
}

export interface OnrampConfig {
  providers: OnrampProvider[];
}

// https with a plain host (no userinfo, no placeholders before the path), checked by hand and by URL.
const isSafeUrlTemplate = (template: string): boolean => {
  const authority = /^https:\/\/([^/?#]*)/.exec(template)?.[1];

  if (!authority || !/^[A-Za-z0-9.-]+(:\d+)?$/.test(authority) || /\s/.test(template)) {
    return false;
  }

  try {
    const url = new URL(template.replace(/\{[^}]*\}/g, 'x'));

    return url.protocol === 'https:' && url.username === '' && url.password === '' && url.hostname.toLowerCase() === authority.replace(/:\d+$/, '').toLowerCase();
  }
  catch {
    return false;
  }
};

const toOnrampProvider = (resource: unknown, index: number): OnrampProvider => {
  const provider = (resource ?? {}) as Partial<OnrampProvider>;
  const label = isNonEmptyString(provider.id) ? provider.id : `#${index}`;

  assert(isNonEmptyString(provider.id), `onramp provider ${label} needs an id`);
  assert(isNonEmptyString(provider.name), `onramp provider ${label} needs a name`);
  assert(Array.isArray(provider.paymentMethods) && provider.paymentMethods.every(isNonEmptyString), `onramp provider ${label} paymentMethods must be strings`);
  assert(isNonEmptyString(provider.urlTemplate) && isSafeUrlTemplate(provider.urlTemplate), `onramp provider ${label} urlTemplate must be https`);
  const placeholders = [...(provider.urlTemplate as string).matchAll(/\{([^}]*)\}/g)].map(match => match[1]);

  placeholders.forEach(name => assert((ONRAMP_PLACEHOLDERS as readonly string[]).includes(name), `onramp provider ${label} uses unknown placeholder {${name}}`));
  assert(!/[{}]/.test((provider.urlTemplate as string).replace(/\{[^}]*\}/g, '')), `onramp provider ${label} urlTemplate has unbalanced braces`);
  assert(typeof provider.assets === 'object' && provider.assets !== null && !Array.isArray(provider.assets), `onramp provider ${label} assets must be an object`);
  Object.entries(provider.assets as Record<string, unknown>).forEach(([key, code]) => {
    assert(/^[^:\s]+:\S+$/.test(key), `onramp provider ${label} asset key ${key} must be "<networkId>:<tokenId>"`);
    assert(isNonEmptyString(code), `onramp provider ${label} asset ${key} needs a code`);
  });

  return {
    id: provider.id as string,
    name: provider.name as string,
    paymentMethods: provider.paymentMethods as string[],
    urlTemplate: provider.urlTemplate as string,
    assets: provider.assets as Record<string, string>,
  };
};

export const toOnrampConfig = (resource: unknown): OnrampConfig => {
  const providers = (resource as Partial<OnrampConfig> | null)?.providers;

  assert(Array.isArray(providers), 'onramp providers must be an array');
  const parsed = (providers as unknown[]).map(toOnrampProvider);

  assert(new Set(parsed.map(provider => provider.id)).size === parsed.length, 'onramp provider ids must be unique');
  return { providers: parsed };
};

// No provider is contracted yet, so the bundled list is empty and Buy shows its unavailable state.
export const ONRAMP_CONFIG: OnrampConfig = toOnrampConfig(onrampProviders);
