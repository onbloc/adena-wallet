/**
 * GRC721 event configuration. Every movement is announced by the grc721 `/p/`
 * package, not by the collection's realm, so an event's `pkg_path` is the
 * package path and the collection lives in the `token` attribute.
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

// Queried as OR-branches, so a chain running several versions is covered by
// adding them here.
export const GRC721_TOKEN_PACKAGES: Grc721TokenPackage[] = [
  { path: 'gno.land/p/nt/grc721/v0', events: DEFAULT_GRC721_EVENTS },
];

/** Event shape of the emitting package; the default when it is not configured. */
export function resolveGrc721Events(
  pkgPath: string | undefined,
  tokenPackages: Grc721TokenPackage[] | undefined,
): Grc721EventSchema {
  const matched = pkgPath
    ? tokenPackages?.find((tokenPackage) => tokenPackage.path === pkgPath)
    : undefined;
  return matched?.events ?? DEFAULT_GRC721_EVENTS;
}

export function isGrc721Package(
  pkgPath: string | undefined,
  tokenPackages: Grc721TokenPackage[] | undefined,
): boolean {
  return !!pkgPath && !!tokenPackages?.some((tokenPackage) => tokenPackage.path === pkgPath);
}
