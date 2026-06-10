import CHAIN_DATA from '@resources/chains/chains.json';

// dApp origin allowlist for gnoconnect meta-tag RPC injection.
// Derived from chains.json gnoUrl. Production also trusts the local gnoweb
// origin used by the bundled dev chain. Other loopback origins are trusted only
// in development builds.
const isDevelopmentBuild = process.env.NODE_ENV !== 'production';
const productionAllowedLoopbackOrigins = ['http://127.0.0.1:8888'];

const isLoopbackOrigin = (url: string): boolean =>
  url.startsWith('http://127.0.0.1') || url.startsWith('http://localhost');

export const GNO_CONNECT_ALLOWED_ORIGINS: readonly string[] = CHAIN_DATA.map(
  (chain) => chain.gnoUrl,
)
  .filter((url): url is string => Boolean(url))
  .filter(
    (url) =>
      url.startsWith('https://') ||
      productionAllowedLoopbackOrigins.includes(url) ||
      (isDevelopmentBuild && isLoopbackOrigin(url)),
  );
