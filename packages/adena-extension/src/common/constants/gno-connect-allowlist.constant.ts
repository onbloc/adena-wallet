// dApp origin allowlist for gnoconnect meta-tag based RPC injection.
// Pages served from these origins may declare their preferred RPC and chain ID
// via <meta name="gnoconnect:rpc"> / <meta name="gnoconnect:chainid">.
// Initial set is sourced from chains.json gnoUrl values.
export const GNO_CONNECT_ALLOWED_ORIGINS: readonly string[] = [
    'https://gno.land',
    'https://betanet.testnets.gno.land',
    'https://staging.gno.land',
    'https://test13.testnets.gno.land',
] as const;
