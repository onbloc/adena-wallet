import CHAIN_DATA from '@resources/chains/chains.json';

// Loopback local hosts served by local gno nodes speak plain HTTP; every other host
// is assumed to be reachable over HTTPS.
export const LOOPBACK_LOCAL_HOST_PATTERN = /^(127\.0\.0\.1|localhost|0\.0\.0\.0|\[::1\])(?::\d+)?$/i;

// dApp origin allowlist for gnoconnect meta-tag RPC injection.
// The single source of truth is chains.json
// Nothing is synthesized or filtered by build mode — to trust another origin
// (e.g. a local node under a different host or port), add it to chains.json.
export const GNO_CONNECT_ALLOWED_ORIGINS: readonly string[] = Array.from(
  new Set(CHAIN_DATA.map((chain) => chain.gnoUrl).filter((url): url is string => Boolean(url))),
);
