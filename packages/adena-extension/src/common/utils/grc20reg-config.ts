import GRC20REG_DATA from '@resources/chains/grc20reg.json';

/**
 * Per-chain GRC20 registry configuration, sourced from the bundled
 * `grc20reg.json` resource (not persisted to storage).
 *
 * - `registries`: the `grc20reg` realms used for list/metadata/balance qeval,
 *   newest version first; the first one holding a token wins.
 * - `tokenPackages`: the `grc20` packages emitting transfer events, each with
 *   the event shape (`type` + attribute keys) of that version.
 * - `helperPath`: the chain's GRC20 helper realm whose `Transfer(tokenKey, to,
 *   amount)` is called via MsgCall. Empty string means no helper is available
 *   yet, so transfers fall back to a MsgRun against the registry.
 */
export interface Grc20TransferEventSchema {
  type: string;
  tokenAttr: string;
  fromAttr: string;
  toAttr: string;
  valueAttr: string;
}

export interface Grc20Registry {
  path: string;
}

export interface Grc20TokenPackage {
  path: string;
  transferEvent: Grc20TransferEventSchema;
}

export interface Grc20RegConfig {
  registries: Grc20Registry[];
  tokenPackages: Grc20TokenPackage[];
  helperPath: string;
}

export const DEFAULT_GRC20_TRANSFER_EVENT: Grc20TransferEventSchema = {
  type: 'Transfer',
  tokenAttr: 'token',
  fromAttr: 'from',
  toAttr: 'to',
  valueAttr: 'value',
};

// Historical hardcoded defaults (see the previous GRC20_REGISTRY_PKG_PATH
// constant). Used when a chain has no grc20reg.json entry.
const DEFAULT_REGISTRIES: Grc20Registry[] = [{ path: 'gno.land/r/demo/defi/grc20reg' }];
const DEFAULT_TOKEN_PACKAGES: Grc20TokenPackage[] = [
  { path: 'gno.land/p/demo/tokens/grc20', transferEvent: DEFAULT_GRC20_TRANSFER_EVENT },
];

type RawTransferEvent = Partial<Grc20TransferEventSchema>;
type RawRegistry = { path?: string };
type RawTokenPackage = { path?: string; transferEvent?: RawTransferEvent };
type RawGrc20RegConfig = {
  helperPath?: string;
  registries?: RawRegistry[];
  tokenPackages?: RawTokenPackage[];
};
type Grc20RegData = Record<string, RawGrc20RegConfig | undefined>;

function normalizeTransferEvent(raw: RawTransferEvent | undefined): Grc20TransferEventSchema {
  return {
    type: raw?.type || DEFAULT_GRC20_TRANSFER_EVENT.type,
    tokenAttr: raw?.tokenAttr || DEFAULT_GRC20_TRANSFER_EVENT.tokenAttr,
    fromAttr: raw?.fromAttr || DEFAULT_GRC20_TRANSFER_EVENT.fromAttr,
    toAttr: raw?.toAttr || DEFAULT_GRC20_TRANSFER_EVENT.toAttr,
    valueAttr: raw?.valueAttr || DEFAULT_GRC20_TRANSFER_EVENT.valueAttr,
  };
}

function normalizeRegistries(raw: RawRegistry[] | undefined): Grc20Registry[] {
  const registries = (raw ?? [])
    .filter((entry): entry is { path: string } => !!entry?.path)
    .map((entry) => ({ path: entry.path }));
  return registries.length > 0 ? registries : DEFAULT_REGISTRIES;
}

function normalizeTokenPackages(raw: RawTokenPackage[] | undefined): Grc20TokenPackage[] {
  const packages = (raw ?? [])
    .filter((entry): entry is RawTokenPackage & { path: string } => !!entry?.path)
    .map((entry) => ({
      path: entry.path,
      transferEvent: normalizeTransferEvent(entry.transferEvent),
    }));
  return packages.length > 0 ? packages : DEFAULT_TOKEN_PACKAGES;
}

export function getGrc20RegConfig(chainId: string | null | undefined): Grc20RegConfig {
  const entry = chainId ? (GRC20REG_DATA as Grc20RegData)[chainId] : undefined;
  return {
    registries: normalizeRegistries(entry?.registries),
    tokenPackages: normalizeTokenPackages(entry?.tokenPackages),
    helperPath: entry?.helperPath || '',
  };
}

export function getGrc20RegistryPaths(chainId: string | null | undefined): string[] {
  return getGrc20RegConfig(chainId).registries.map((registry) => registry.path);
}

// Transfer-event shape of the package that emitted an event; the shared
// default when the package is not a configured version.
export function resolveGrc20TransferEvent(
  pkgPath: string | undefined,
  tokenPackages: Grc20TokenPackage[] | undefined,
): Grc20TransferEventSchema {
  const matched = pkgPath
    ? tokenPackages?.find((tokenPackage) => tokenPackage.path === pkgPath)
    : undefined;
  return matched?.transferEvent ?? DEFAULT_GRC20_TRANSFER_EVENT;
}
