import GRC20REG_DATA from '@resources/chains/grc20reg.json';

/**
 * Per-chain GRC20 registry configuration, sourced from the bundled
 * `grc20reg.json` resource (not persisted to storage).
 *
 * - `registryPath`: the `grc20reg` realm used for list/metadata/balance qeval.
 * - `helperPath`: the chain's GRC20 helper realm whose `Transfer(tokenKey, to,
 *   amount)` is called via MsgCall. Empty string means no helper is available
 *   yet, so transfers fall back to a MsgRun against the registry.
 */
export interface Grc20RegConfig {
  registryPath: string;
  helperPath: string;
}

// Historical hardcoded default (see the previous GRC20_REGISTRY_PKG_PATH
// constant). Used when a chain has no grc20reg.json entry.
const DEFAULT_REGISTRY_PATH = 'gno.land/r/demo/defi/grc20reg';

type Grc20RegData = Record<string, Partial<Grc20RegConfig> | undefined>;

export function getGrc20RegConfig(chainId: string | null | undefined): Grc20RegConfig {
  const entry = chainId ? (GRC20REG_DATA as Grc20RegData)[chainId] : undefined;
  return {
    registryPath: entry?.registryPath || DEFAULT_REGISTRY_PATH,
    helperPath: entry?.helperPath || '',
  };
}

export function getGrc20RegistryPath(chainId: string | null | undefined): string {
  return getGrc20RegConfig(chainId).registryPath;
}
