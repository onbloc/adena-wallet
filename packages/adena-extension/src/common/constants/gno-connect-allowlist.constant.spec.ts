import CHAIN_DATA from '@resources/chains/chains.json';
import {
  getLoopbackOriginChainId,
  GNO_CONNECT_ALLOWED_ORIGINS,
  isLoopbackOrigin,
} from './gno-connect-allowlist.constant';

describe('GNO_CONNECT_ALLOWED_ORIGINS', () => {
  it('statically trusts every https gnoUrl origin declared in chains.json', () => {
    expect(GNO_CONNECT_ALLOWED_ORIGINS).toEqual(
      expect.arrayContaining(['https://gno.land', 'https://staging.gno.land']),
    );
  });

  it('never statically trusts a loopback origin', () => {
    // Loopback origins are gated at runtime against the wallet's active network,
    // so they must not appear in the unconditional allowlist.
    expect(GNO_CONNECT_ALLOWED_ORIGINS.some((origin) => isLoopbackOrigin(origin))).toBe(false);
    expect(GNO_CONNECT_ALLOWED_ORIGINS).not.toContain('http://127.0.0.1:8888');
  });

  it('contains no duplicates', () => {
    expect(new Set(GNO_CONNECT_ALLOWED_ORIGINS).size).toBe(GNO_CONNECT_ALLOWED_ORIGINS.length);
  });

  it('stays derived from chains.json, so every bundled remote gnoUrl is trusted', () => {
    // The list is a projection of chains.json: editing that file is the only way
    // to add or remove a trusted dApp origin. Retiring pearl-1 there (#895) is
    // exactly why pearl.testnets.gno.land TxLinks stopped reaching the wallet.
    const bundledRemoteOrigins = CHAIN_DATA.map((chain: { gnoUrl?: string }) => chain.gnoUrl)
      .filter((origin: string | undefined): origin is string => Boolean(origin))
      .filter((origin: string) => !isLoopbackOrigin(origin));

    expect(bundledRemoteOrigins.length).toBeGreaterThan(0);
    expect(GNO_CONNECT_ALLOWED_ORIGINS).toEqual(expect.arrayContaining(bundledRemoteOrigins));
  });
});

describe('isLoopbackOrigin', () => {
  it('recognizes plain-http loopback origins', () => {
    expect(isLoopbackOrigin('http://127.0.0.1:8888')).toBe(true);
    expect(isLoopbackOrigin('http://localhost:8888')).toBe(true);
    expect(isLoopbackOrigin('http://127.0.0.1')).toBe(true);
  });

  it('rejects non-loopback and https origins', () => {
    expect(isLoopbackOrigin('https://gno.land')).toBe(false);
    expect(isLoopbackOrigin('https://127.0.0.1:8888')).toBe(false);
    expect(isLoopbackOrigin('http://evil.example')).toBe(false);
    // A loopback host embedded in a larger hostname must not match.
    expect(isLoopbackOrigin('http://127.0.0.1.evil.example')).toBe(false);
  });
});

describe('getLoopbackOriginChainId', () => {
  it('maps a known loopback origin to the chainId that declares it', () => {
    expect(getLoopbackOriginChainId('http://127.0.0.1:8888')).toBe('dev');
  });

  it('returns null for https origins and unknown loopback origins', () => {
    expect(getLoopbackOriginChainId('https://gno.land')).toBeNull();
    expect(getLoopbackOriginChainId('http://127.0.0.1:9999')).toBeNull();
    expect(getLoopbackOriginChainId('http://localhost:8888')).toBeNull();
  });
});
