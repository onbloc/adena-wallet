import CHAIN_DATA from '@resources/chains/chains.json';

// Loopback local hosts served by local gno nodes speak plain HTTP; every other host
// is assumed to be reachable over HTTPS.
export const LOOPBACK_LOCAL_HOST_PATTERN = /^(127\.0\.0\.1|localhost|0\.0\.0\.0|\[::1\])(?::\d+)?$/i;

// True when `origin` is a plain-HTTP loopback origin (e.g. http://127.0.0.1:8888).
export const isLoopbackOrigin = (origin: string): boolean => {
  const HTTP_PREFIX = 'http://';
  if (!origin.startsWith(HTTP_PREFIX)) {
    return false;
  }

  return LOOPBACK_LOCAL_HOST_PATTERN.test(origin.slice(HTTP_PREFIX.length));
};

// gnoconnect meta-tag RPC injection is gated by the dApp origin. The single
// source of truth is chains.json.
//
// - Remote (https) gno origins are team-controlled and trusted unconditionally.
// - Loopback origins (local dev nodes) are NOT statically trusted:
//   any process that holds the local port could otherwise drive the wallet flow.
//   They are honored only at runtime, when the wallet's *active* network is the one that
//   declares them (see getLoopbackOriginChainId + the runtime gate in CommandHandler).
interface ChainOrigin {
  origin: string;
  chainId: string;
}

const CHAIN_ORIGINS: ChainOrigin[] = CHAIN_DATA.map((chain) => ({
  origin: chain.gnoUrl,
  chainId: chain.chainId,
})).filter((entry): entry is ChainOrigin => Boolean(entry.origin));

// Remote https origins — trusted unconditionally.
export const GNO_CONNECT_ALLOWED_ORIGINS: readonly string[] = Array.from(
  new Set(
    CHAIN_ORIGINS.filter(({ origin }) => !isLoopbackOrigin(origin)).map(({ origin }) => origin),
  ),
);

// Loopback origin -> the chainId that declares it.
// Trust is granted only when this chainId matches the wallet's active network
const LOOPBACK_ORIGIN_CHAIN_IDS: ReadonlyMap<string, string> = new Map(
  CHAIN_ORIGINS.filter(({ origin }) => isLoopbackOrigin(origin)).map(
    ({ origin, chainId }) => [origin, chainId] as const,
  ),
);

// Returns the chainId a loopback origin may act as, or null
// if the origin is not a known loopback gno origin.
// Callers MUST additionally verify this chainId is the wallet's active network
// before honoring the origin's gnoconnect data.
export const getLoopbackOriginChainId = (origin: string): string | null =>
  LOOPBACK_ORIGIN_CHAIN_IDS.get(origin) ?? null;
