import { GnoJSONRPCProvider } from '@gnolang/gno-js-client';

export type GnoProvider = GnoJSONRPCProvider;

export type GnoProviderFactory = (rpcUrl: string) => Promise<GnoProvider>;

// Reuses one provider per RPC endpoint.
export const createCachedGnoProviderFactory = (): GnoProviderFactory => {
  const cache = new Map<string, Promise<GnoProvider>>();

  return (rpcUrl: string) => {
    let provider = cache.get(rpcUrl);

    if (!provider) {
      provider = GnoJSONRPCProvider.create(rpcUrl);
      provider.catch(() => cache.delete(rpcUrl));
      cache.set(rpcUrl, provider);
    }

    return provider;
  };
};
