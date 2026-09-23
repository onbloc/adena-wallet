/**
 * GRC721 package configuration.
 *
 * Every GRC721 movement is announced by the grc721 `/p/` package, not by the
 * collection's realm, so discovery and holdings are read from that package's
 * events. `gno.land/p/nt/grc721/v0` emits:
 *
 * - `NewToken` — `token` (`Token.ID()`), `name`, `symbol`. Emitted once per
 *   collection in `NewToken`, which is the only way a `Token` can be created,
 *   so it is a complete list of the chain's collections.
 * - `Transfer` — `token`, `from`, `to`, `tokenId`. Mint emits an empty `from`
 *   and burn an empty `to` (EIP-721), so replaying `Transfer` alone
 *   reconstructs ownership.
 *
 * The list is queried as OR-branches, so adding a package here is how a chain
 * running more than one grc721 version stays fully covered.
 */
export interface Grc721EventSchema {
  newTokenType: string;
  transferType: string;
  tokenAttr: string;
  nameAttr: string;
  symbolAttr: string;
  fromAttr: string;
  toAttr: string;
  tokenIdAttr: string;
}

export interface Grc721TokenPackage {
  path: string;
  events: Grc721EventSchema;
}

export const DEFAULT_GRC721_EVENTS: Grc721EventSchema = {
  newTokenType: 'NewToken',
  transferType: 'Transfer',
  tokenAttr: 'token',
  nameAttr: 'name',
  symbolAttr: 'symbol',
  fromAttr: 'from',
  toAttr: 'to',
  tokenIdAttr: 'tokenId',
};

export const GRC721_TOKEN_PACKAGES: Grc721TokenPackage[] = [
  { path: 'gno.land/p/nt/grc721/v0', events: DEFAULT_GRC721_EVENTS },
];

/**
 * Event shape of the package that emitted an event; the shared default when the
 * package is not a configured version.
 */
export function resolveGrc721Events(
  pkgPath: string | undefined,
  tokenPackages: Grc721TokenPackage[] | undefined,
): Grc721EventSchema {
  const matched = pkgPath
    ? tokenPackages?.find((tokenPackage) => tokenPackage.path === pkgPath)
    : undefined;
  return matched?.events ?? DEFAULT_GRC721_EVENTS;
}

/** True when the event was emitted by one of the configured grc721 packages. */
export function isGrc721Package(
  pkgPath: string | undefined,
  tokenPackages: Grc721TokenPackage[] | undefined,
): boolean {
  return !!pkgPath && !!tokenPackages?.some((tokenPackage) => tokenPackage.path === pkgPath);
}
