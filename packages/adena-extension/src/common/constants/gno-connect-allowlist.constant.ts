import CHAIN_DATA from '@resources/chains/chains.json';

// dApp origin allowlist for gnoconnect meta-tag RPC injection.
// Derived from chains.json gnoUrl. Loopback origins (127.0.0.1, localhost)
// are trusted only in development builds — in production any process
// holding the local port (other dev servers, malicious postinstall, etc.)
// could otherwise inject RPC endpoints into the wallet flow.
const isDevelopmentBuild = process.env.NODE_ENV !== 'production';

const isLoopbackOrigin = (url: string): boolean =>
  url.startsWith('http://127.0.0.1') || url.startsWith('http://localhost');

export const GNO_CONNECT_ALLOWED_ORIGINS: readonly string[] = CHAIN_DATA.map(
  (chain) => chain.gnoUrl,
)
  .filter((url): url is string => Boolean(url))
  .filter((url) => url.startsWith('https://') || (isDevelopmentBuild && isLoopbackOrigin(url)));
