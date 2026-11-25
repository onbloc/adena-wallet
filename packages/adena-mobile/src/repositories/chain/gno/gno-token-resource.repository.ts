import { REMOTE_RESOURCES } from '../../../config/endpoints';
import { ChainFamily, Network } from '../../../domain/network';
import { Token, TokenType } from '../../../domain/token';
import { HttpClient } from '../../../infrastructure/http/http-client';
import { getNativeTokenFor } from '../../../resources';
import { parseRegistryKey, toRegistryKey } from './gno-token-key';

interface TokenResourceItem {
  name: string;
  symbol: string;
  decimals: number;
  description?: string;
  website_url?: string;
  image?: string;
}

interface Grc20ResourceItem extends TokenResourceItem {
  pkg_path: string;
  routes?: unknown;
}

export interface Grc20RouteFunc {
  name: string;
  args: string[];
}

export interface CuratedTokenList {
  tokens: Token[];
  // Transfer routes keyed by registry key.
  routes: Record<string, Record<string, Grc20RouteFunc>>;
  // False when the GRC20 list could not be fetched; such a list must not be read as delistings.
  complete: boolean;
}

const CACHE_TTL_MS = 10 * 60 * 1000;
const EXPORTED_FUNC = /^[A-Z][A-Za-z0-9_]*$/;

const parseRoutes = (raw: unknown): Record<string, Grc20RouteFunc> | null => {
  const funcs = (raw as { funcs?: Record<string, unknown> } | undefined)?.funcs;

  if (!funcs || typeof funcs !== 'object') {
    return null;
  }

  const parsed: Record<string, Grc20RouteFunc> = {};

  for (const [op, value] of Object.entries(funcs)) {
    const { name, args } = (value ?? {}) as { name?: unknown; args?: unknown };

    if (typeof name === 'string' && EXPORTED_FUNC.test(name) && Array.isArray(args) && args.every(arg => typeof arg === 'string')) {
      parsed[op] = { name, args: args as string[] };
    }
  }

  return parsed;
};

// Curated token lists published in onbloc/gno-token-resource, cached per network.
export class GnoTokenResourceRepository {
  private readonly cache = new Map<string, { at: number; value: Promise<CuratedTokenList> }>();

  constructor(private readonly http: HttpClient, private readonly baseUrl: string = REMOTE_RESOURCES.gnoTokenResourceBase) {}

  get(network: Network): Promise<CuratedTokenList> {
    const cached = this.cache.get(network.id);

    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      return cached.value;
    }

    const value = this.load(network);
    const evict = (): void => {
      if (this.cache.get(network.id)?.value === value) {
        this.cache.delete(network.id);
      }
    };

    // An incomplete list is served once but not cached, so the next call retries.
    value.then(list => !list.complete && evict(), evict);
    this.cache.set(network.id, { at: Date.now(), value });
    return value;
  }

  private imageUrl(path?: string): string | undefined {
    return path ? `${this.baseUrl}${path}` : undefined;
  }

  private async load(network: Network): Promise<CuratedTokenList> {
    const native = getNativeTokenFor(network);
    const [nativeItems, grc20Items] = await Promise.all([
      this.http.request<(TokenResourceItem & { denom: string })[]>(`${this.baseUrl}/gno-native/${network.id}.json`).catch(() => []),
      this.http.request<Grc20ResourceItem[]>(`${this.baseUrl}/grc20/${network.id}.json`).catch(() => null),
    ]);

    const nativeOverlay = nativeItems.find(item => item.denom === native.denom);
    const tokens: Token[] = [{
      ...native,
      description: nativeOverlay?.description,
      websiteUrl: nativeOverlay?.website_url,
      imageUrl: this.imageUrl(nativeOverlay?.image),
    }];
    const routes: CuratedTokenList['routes'] = {};

    for (const item of grc20Items ?? []) {
      const id = toRegistryKey(item.pkg_path, item.symbol);

      if (!parseRegistryKey(id) || !Number.isInteger(item.decimals)) {
        continue;
      }

      tokens.push({
        id,
        networkId: network.id,
        family: ChainFamily.GNO,
        type: TokenType.GRC20,
        name: item.name,
        symbol: item.symbol,
        decimals: item.decimals,
        pkgPath: item.pkg_path,
        imageUrl: this.imageUrl(item.image),
        description: item.description,
        websiteUrl: item.website_url,
        isNative: false,
      });
      const parsed = parseRoutes(item.routes);

      if (parsed) {
        routes[id] = parsed;
      }
    }

    return { tokens, routes, complete: grc20Items !== null };
  }
}
