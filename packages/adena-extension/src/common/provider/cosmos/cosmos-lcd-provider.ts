import {
  CosmosAccount,
  CosmosBroadcastMode,
  CosmosNetworkProfile,
  CosmosProvider,
  CosmosTxBroadcastResponse,
} from 'adena-module';

import { CosmosQueryClient } from './cosmos-query-client';

const DEBOUNCE_MS = 5_000;

/**
 * LCD (REST) implementation of the adena-module CosmosProvider interface.
 * Mirrors the Gno DI pattern: adena-module owns the interface, and this
 * extension-side class provides the concrete HTTP-backed implementation.
 *
 * Wraps CosmosQueryClient with per-call 5-second debounce and a manual
 * invalidate() trigger. Broadcast is not debounced — each broadcastTx always
 * hits the network.
 *
 * Failover across multiple endpoints is intentionally out of scope for this
 * PR because the current AtomOne network profiles ship with a single RPC/REST
 * endpoint each. The array shape is preserved so failover can be added later
 * without touching callers.
 */
export class CosmosLcdProvider implements CosmosProvider {
  private readonly client: CosmosQueryClient;
  private readonly debounceCache: Map<
    string,
    { at: number; promise: Promise<unknown> }
  >;
  private readonly restEndpoint: string;

  constructor(private readonly profile: CosmosNetworkProfile) {
    if (!profile.restEndpoints?.length) {
      throw new Error(
        `CosmosLcdProvider: restEndpoints empty for ${profile.chainId}`,
      );
    }
    this.client = new CosmosQueryClient();
    this.debounceCache = new Map();
    this.restEndpoint = profile.restEndpoints[0].replace(/\/$/, '');
  }

  private async dedupe<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const cached = this.debounceCache.get(key);
    if (cached && now - cached.at < DEBOUNCE_MS) {
      return cached.promise as Promise<T>;
    }
    const promise = fn();
    this.debounceCache.set(key, { at: now, promise });
    return promise;
  }

  invalidate(): void {
    this.debounceCache.clear();
  }

  getAccount(address: string): Promise<CosmosAccount> {
    return this.dedupe(`acc:${address}`, () =>
      this.client.getAccount(this.restEndpoint, address),
    );
  }

  getAllBalances(
    address: string,
  ): Promise<{ denom: string; amount: string }[] | null> {
    return this.dedupe(`bals:${address}`, () =>
      this.client.getAllBalances(this.restEndpoint, address),
    );
  }

  getBalance(address: string, denom: string): Promise<string | null> {
    return this.dedupe(`bal:${address}:${denom}`, () =>
      this.client.getBalance(this.restEndpoint, address, denom),
    );
  }

  getMinGasPrices(): Promise<{ denom: string; amount: string }[]> {
    return this.dedupe('fee:mingasprices', () =>
      this.client.getMinGasPrices(this.restEndpoint),
    );
  }

  simulateTx(txBytes: Uint8Array): Promise<{ gasUsed: number }> {
    // Intentionally not cached: each simulate reflects the specific tx bytes
    // passed in, so caching by key would require hashing the payload.
    return this.client.simulateTx(this.restEndpoint, txBytes);
  }

  broadcastTx(
    txBytes: Uint8Array,
    mode?: CosmosBroadcastMode,
  ): Promise<CosmosTxBroadcastResponse> {
    return this.client.broadcastTx(this.restEndpoint, txBytes, mode);
  }
}
