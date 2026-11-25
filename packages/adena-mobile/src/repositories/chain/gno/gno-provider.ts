import { GnoJSONRPCProvider } from '@gnolang/gno-js-client';

export type GnoProvider = GnoJSONRPCProvider;

export type GnoProviderFactory = (rpcUrl: string) => Promise<GnoProvider>;

// The RPC transport has no timeout of its own, so a stalled connection would hang forever.
export const DEFAULT_GNO_RPC_TIMEOUT_MS = 12_000;

export class GnoRpcTimeoutError extends Error {
  constructor(readonly operation: string, readonly timeoutMs: number) {
    super(`Gno RPC ${operation} timed out after ${timeoutMs}ms`);
    this.name = 'GnoRpcTimeoutError';
  }
}

// Read-only calls only: a timed-out broadcast could still land, so sendTransaction is never bounded.
const READ_METHODS: ReadonlySet<string> = new Set([
  'abciQuery',
  'estimateGas',
  'evaluateExpression',
  'getAccount',
  'getAccountNumber',
  'getAccountSequence',
  'getBalance',
  'getBlock',
  'getBlockNumber',
  'getBlockResult',
  'getConsensusParams',
  'getFileContent',
  'getFunctionSignatures',
  'getGasPrice',
  'getNetwork',
  'getRealmPaths',
  'getRenderOutput',
  'getSession',
  'getSessions',
  'getStatus',
  'getTransaction',
]);

export const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new GnoRpcTimeoutError(operation, timeoutMs)), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
};

// Wraps the read methods of a provider with a timeout; every other member passes through untouched.
export const withReadTimeout = <T extends object>(provider: T, timeoutMs: number): T =>
  new Proxy(provider, {
    get(target, property, receiver): unknown {
      const value = Reflect.get(target, property, receiver);

      if (typeof property !== 'string' || !READ_METHODS.has(property) || typeof value !== 'function') {
        return value;
      }

      return (...args: unknown[]): Promise<unknown> => withTimeout(Promise.resolve(value.apply(target, args)), timeoutMs, property);
    },
  });

// Reuses one provider per RPC endpoint.
export const createCachedGnoProviderFactory = (timeoutMs = DEFAULT_GNO_RPC_TIMEOUT_MS): GnoProviderFactory => {
  const cache = new Map<string, Promise<GnoProvider>>();

  return (rpcUrl: string) => {
    let provider = cache.get(rpcUrl);

    if (!provider) {
      // create() probes the node, so it is bounded too.
      provider = withTimeout(GnoJSONRPCProvider.create(rpcUrl), timeoutMs, 'connect').then(created => withReadTimeout(created, timeoutMs));
      provider.catch(() => cache.delete(rpcUrl));
      cache.set(rpcUrl, provider);
    }

    return provider;
  };
};
