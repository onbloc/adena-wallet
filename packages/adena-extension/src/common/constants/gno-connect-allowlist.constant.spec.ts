describe('GNO_CONNECT_ALLOWED_ORIGINS', () => {
  const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = ORIGINAL_NODE_ENV;
  });

  const loadAllowlist = (): readonly string[] => {
    let result: readonly string[] = [];
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      result = require('./gno-connect-allowlist.constant').GNO_CONNECT_ALLOWED_ORIGINS;
    });
    return result;
  };

  it('trusts exactly the gnoUrl origins declared in chains.json', () => {
    const result = loadAllowlist();

    expect(result).toEqual(
      expect.arrayContaining([
        'https://gno.land',
        'https://betanet.testnets.gno.land',
        'https://staging.gno.land',
        'https://test13.testnets.gno.land',
        'http://127.0.0.1:8888',
      ]),
    );
  });

  it('trusts the local (loopback) origin regardless of build mode', () => {
    // The Local network must support gnoconnect txlinks even in production builds.
    process.env.NODE_ENV = 'production';
    const prodResult = loadAllowlist();
    process.env.NODE_ENV = 'development';
    const devResult = loadAllowlist();

    expect(prodResult).toContain('http://127.0.0.1:8888');
    expect(new Set(prodResult)).toEqual(new Set(devResult));
  });

  it('contains no duplicates', () => {
    const result = loadAllowlist();

    expect(new Set(result).size).toBe(result.length);
  });
});
