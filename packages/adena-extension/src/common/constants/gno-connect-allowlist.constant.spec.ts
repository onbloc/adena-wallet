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

  it('production build trusts only https chains.json origins', () => {
    process.env.NODE_ENV = 'production';
    const result = loadAllowlist();

    expect(result).toEqual(
      expect.arrayContaining([
        'https://gno.land',
        'https://betanet.testnets.gno.land',
        'https://staging.gno.land',
        'https://test13.testnets.gno.land',
      ]),
    );
    expect(result.some((url) => url.startsWith('http://'))).toBe(false);
  });

  it('development build also trusts loopback origins from chains.json', () => {
    process.env.NODE_ENV = 'development';
    const result = loadAllowlist();

    expect(result).toEqual(expect.arrayContaining(['https://gno.land', 'http://127.0.0.1:8888']));
  });

  it('test environment behaves like development (non-production)', () => {
    process.env.NODE_ENV = 'test';
    const result = loadAllowlist();

    expect(result).toContain('http://127.0.0.1:8888');
  });

  it('contains no duplicates', () => {
    process.env.NODE_ENV = 'production';
    const result = loadAllowlist();

    expect(new Set(result).size).toBe(result.length);
  });
});
