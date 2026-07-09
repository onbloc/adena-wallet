import {
  getLoopbackGnoConnectChainId,
  GnoMessageInfo,
  isAllowedGnoConnectOrigin,
  isLoopbackGnoConnectTrusted,
  normalizeGnoConnectRpc,
  parseGnoMessageInfo,
} from './gno-connect';

describe('parseGnoMessageInfo', () => {
  describe('URL parsing tests', () => {
    it('should correctly parse URL with standard path and no pkgpath parameter', () => {
      // Test URL (Case 1)
      const url = 'https://gno.land/r/gnoland/users/v1$help&func=Register&.send=1000000ugnot';

      // Execute function
      const result = parseGnoMessageInfo(url);

      // Expected result
      const expected: GnoMessageInfo = {
        packagePath: 'gno.land/r/gnoland/users/v1',
        functionName: 'Register',
        send: '1000000ugnot',
        maxDeposit: '',
        args: null,
      };

      // Verify result
      expect(result).toEqual(expected);
    });

    it('should correctly parse and decode URL with pkgpath parameter', () => {
      // Test URL (Case 2)
      const url =
        'https://gno.land/r/leon/hor$help&func=Upvote&pkgpath=gno.land%2Fr%2Fmorgan%2Fhome';

      // Execute function
      const result = parseGnoMessageInfo(url);

      // Expected result
      const expected: GnoMessageInfo = {
        packagePath: 'gno.land/r/leon/hor',
        functionName: 'Upvote',
        send: '',
        maxDeposit: '',
        args: [
          {
            index: 0,
            key: 'pkgpath',
            value: 'gno.land/r/morgan/home',
          },
        ],
      };

      // Verify result
      expect(result).toEqual(expected);
    });
  });

  describe('Complete field population tests', () => {
    it('should correctly parse URL with all five fields populated', () => {
      // Test URL (with all fields populated)
      const url =
        'https://gno.land/r/demo/test$help&func=CompleteFunction&.send=500000ugnot&.max_deposit=1000000ugnot&arg1=value1&arg2=value2&arg3=value3';

      // Execute function
      const result = parseGnoMessageInfo(url);

      // Expected result
      const expected: GnoMessageInfo = {
        packagePath: 'gno.land/r/demo/test',
        functionName: 'CompleteFunction',
        send: '500000ugnot',
        maxDeposit: '1000000ugnot',
        args: [
          { index: 0, key: 'arg1', value: 'value1' },
          { index: 1, key: 'arg2', value: 'value2' },
          { index: 2, key: 'arg3', value: 'value3' },
        ],
      };

      // Verify result
      expect(result).toEqual(expected);
    });

    it('should correctly parse URL with all five fields populated using pkgpath parameter', () => {
      // Test URL (with all fields populated using pkgpath)
      const url =
        'https://gno.land/r/demo/placeholder$help&func=FullTest&pkgpath=gno.land%2Fr%2Ftest%2Fcomplete&.send=750000ugnot&.max_deposit=2000000ugnot&param1=test1&param2=test2';

      // Execute function
      const result = parseGnoMessageInfo(url);

      // Expected result
      const expected: GnoMessageInfo = {
        packagePath: 'gno.land/r/demo/placeholder',
        functionName: 'FullTest',
        send: '750000ugnot',
        maxDeposit: '2000000ugnot',
        args: [
          { index: 0, key: 'pkgpath', value: 'gno.land/r/test/complete' },
          { index: 1, key: 'param1', value: 'test1' },
          { index: 2, key: 'param2', value: 'test2' },
        ],
      };

      // Verify result
      expect(result).toEqual(expected);
    });
  });

  describe('URL encoding and decoding tests', () => {
    it('should correctly decode all URL-encoded arguments', () => {
      // Test URL with multiple encoded parameters
      const url =
        'https://gno.land/r/demo/test$help&func=TestFunction' +
        '&encoded1=Hello%20World' +
        '&encoded2=%3Cscript%3Ealert(1)%3C%2Fscript%3E' +
        '&encoded3=special%40%23%24%25%5E%26*()' +
        '&encoded4=path%2Fto%2Fresource' +
        '&encoded5=%E2%9C%93%20Unicode%20Check';

      // Execute function
      const result = parseGnoMessageInfo(url);

      // Expected result
      const expected: GnoMessageInfo = {
        packagePath: 'gno.land/r/demo/test',
        functionName: 'TestFunction',
        send: '',
        maxDeposit: '',
        args: [
          { index: 0, key: 'encoded1', value: 'Hello World' },
          { index: 1, key: 'encoded2', value: '<script>alert(1)</script>' },
          { index: 2, key: 'encoded3', value: 'special@#$%^&*()' },
          { index: 3, key: 'encoded4', value: 'path/to/resource' },
          { index: 4, key: 'encoded5', value: '✓ Unicode Check' },
        ],
      };

      // Verify result
      expect(result).toEqual(expected);
    });

    it('should correctly handle mixed encoded and non-encoded arguments', () => {
      // Test URL with a mix of encoded and non-encoded parameters
      const url =
        'https://gno.land/r/demo/test$help&func=MixedTest' +
        '&plain=simple text' +
        '&encoded=complex%20text%20with%20spaces' +
        '&.send=1000ugnot' +
        '&mixed=half%20encoded+half+plus';

      // Execute function
      const result = parseGnoMessageInfo(url);

      // Expected result
      const expected: GnoMessageInfo = {
        packagePath: 'gno.land/r/demo/test',
        functionName: 'MixedTest',
        send: '1000ugnot',
        maxDeposit: '',
        args: [
          { index: 0, key: 'plain', value: 'simple text' },
          { index: 1, key: 'encoded', value: 'complex text with spaces' },
          { index: 2, key: 'mixed', value: 'half encoded+half+plus' },
        ],
      };

      // Verify result
      expect(result).toEqual(expected);
    });

    it('should properly decode pkgpath and other special parameters', () => {
      // Test URL with encoded pkgpath and other special parameters
      const url =
        'https://gno.land/r/demo/test$help&func=SpecialTest' +
        '&pkgpath=gno.land%2Fr%2Ftest%2Fpackage%20with%20spaces' +
        '&url=https%3A%2F%2Fexample.com%2Fpath%3Fparam%3Dvalue' +
        '&json=%7B%22key%22%3A%22value%22%7D'; // {"key":"value"}

      // Execute function
      const result = parseGnoMessageInfo(url);

      // Expected result
      const expected: GnoMessageInfo = {
        packagePath: 'gno.land/r/demo/test',
        functionName: 'SpecialTest',
        send: '',
        maxDeposit: '',
        args: [
          { index: 0, key: 'pkgpath', value: 'gno.land/r/test/package with spaces' },
          { index: 1, key: 'url', value: 'https://example.com/path?param=value' },
          { index: 2, key: 'json', value: '{"key":"value"}' },
        ],
      };

      // Verify result
      expect(result).toEqual(expected);
    });
  });

  describe('Invalid URL tests', () => {
    it('should return null for URL without $help marker', () => {
      // Test URL (Invalid Case 1)
      const url = 'https://gno.land/r/demo/demo';
      const result = parseGnoMessageInfo(url);
      expect(result).toBeNull();
    });

    it('should return null for URL without func parameter', () => {
      // Test URL (Invalid Case 2)
      const url = 'https://gno.land/r/demo/demo$help';
      const result = parseGnoMessageInfo(url);
      expect(result).toBeNull();
    });

    it('should return null for URL without package path', () => {
      // Test URL (Invalid Case 3)
      const url = 'https://gno.land/$help&func=Test';
      const result = parseGnoMessageInfo(url);
      expect(result).toBeNull();
    });
  });

  describe('For data verification', () => {
    it('data console.log', () => {
      const url =
        'https://gno.land/r/leon/hor$help&func=Upvote&pkgpath=gno.land%2Fr%2Fmorgan%2Fhome';
      const result = parseGnoMessageInfo(url);
      console.log(result, 'result');
    });
  });
});

describe('isAllowedGnoConnectOrigin', () => {
  it('returns true for registered gno.land origins', () => {
    expect(isAllowedGnoConnectOrigin('https://gno.land')).toBe(true);
    expect(isAllowedGnoConnectOrigin('https://betanet.testnets.gno.land')).toBe(true);
    expect(isAllowedGnoConnectOrigin('https://staging.gno.land')).toBe(true);
    expect(isAllowedGnoConnectOrigin('https://test13.testnets.gno.land')).toBe(true);
  });

  it('returns false for unregistered origins', () => {
    expect(isAllowedGnoConnectOrigin('https://attacker.example')).toBe(false);
    expect(isAllowedGnoConnectOrigin('https://evil.gno.land.attacker.example')).toBe(false);
  });

  it('rejects scheme mismatches', () => {
    expect(isAllowedGnoConnectOrigin('http://gno.land')).toBe(false);
  });

  it('rejects origins with explicit non-default port', () => {
    expect(isAllowedGnoConnectOrigin('https://gno.land:8443')).toBe(false);
  });

  it('rejects empty origin', () => {
    expect(isAllowedGnoConnectOrigin('')).toBe(false);
  });

  it('rejects subdomain takeover patterns', () => {
    expect(isAllowedGnoConnectOrigin('https://malicious.gno.land')).toBe(false);
  });

  it('never statically trusts loopback origins', () => {
    expect(isAllowedGnoConnectOrigin('http://127.0.0.1:8888')).toBe(false);
    expect(isAllowedGnoConnectOrigin('http://localhost:8888')).toBe(false);
  });
});

describe('getLoopbackGnoConnectChainId', () => {
  it('returns the chainId a known loopback origin may act as', () => {
    expect(getLoopbackGnoConnectChainId('http://127.0.0.1:8888')).toBe('dev');
  });

  it('returns null for non-loopback or unknown origins', () => {
    expect(getLoopbackGnoConnectChainId('https://gno.land')).toBeNull();
    expect(getLoopbackGnoConnectChainId('http://127.0.0.1:9999')).toBeNull();
  });
});

describe('isLoopbackGnoConnectTrusted', () => {
  const LOOPBACK_CHAIN_ID = 'dev';

  it('trusts a loopback origin when both the meta chainId and the active network match', () => {
    expect(isLoopbackGnoConnectTrusted(LOOPBACK_CHAIN_ID, 'dev', 'dev')).toBe(true);
  });

  it('rejects a foreign meta chainId even when the active network matches the origin', () => {
    // Regression: a page served from http://127.0.0.1:8888 (origin -> dev) while
    // the wallet is already on dev must not be allowed to declare a different
    // chainId (e.g. gnoland1) and switch/sign against a foreign network.
    expect(isLoopbackGnoConnectTrusted(LOOPBACK_CHAIN_ID, 'gnoland1', 'dev')).toBe(false);
  });

  it('rejects when the active network is not the loopback chainId', () => {
    expect(isLoopbackGnoConnectTrusted(LOOPBACK_CHAIN_ID, 'dev', 'gnoland1')).toBe(false);
  });

  it('rejects when the active network is unavailable (e.g. wallet locked)', () => {
    expect(isLoopbackGnoConnectTrusted(LOOPBACK_CHAIN_ID, 'dev', undefined)).toBe(false);
  });

  it('rejects when neither the meta chainId nor the active network match', () => {
    expect(isLoopbackGnoConnectTrusted(LOOPBACK_CHAIN_ID, 'gnoland1', 'gnoland1')).toBe(false);
  });
});

describe('normalizeGnoConnectRpc', () => {
  it('keeps http(s) endpoints as-is', () => {
    expect(normalizeGnoConnectRpc('https://rpc.gno.land')).toBe('https://rpc.gno.land');
    expect(normalizeGnoConnectRpc('http://127.0.0.1:26657')).toBe('http://127.0.0.1:26657');
  });

  it('maps a non-http scheme on a loopback host to http://', () => {
    // Local gno nodes commonly advertise their RPC as tcp://; downstream RPC
    // clients require http(s), so it must be rewritten rather than stripped bare.
    expect(normalizeGnoConnectRpc('tcp://127.0.0.1:26657')).toBe('http://127.0.0.1:26657');
    expect(normalizeGnoConnectRpc('tcp://localhost:26657')).toBe('http://localhost:26657');
  });

  it('adds a protocol to a bare loopback host', () => {
    expect(normalizeGnoConnectRpc('127.0.0.1:26657')).toBe('http://127.0.0.1:26657');
  });

  it('assumes https for non-loopback hosts missing a protocol', () => {
    expect(normalizeGnoConnectRpc('tcp://rpc.gno.land')).toBe('https://rpc.gno.land');
    expect(normalizeGnoConnectRpc('rpc.gno.land')).toBe('https://rpc.gno.land');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeGnoConnectRpc('  http://127.0.0.1:26657  ')).toBe('http://127.0.0.1:26657');
  });

  it('returns an empty string unchanged', () => {
    expect(normalizeGnoConnectRpc('')).toBe('');
    expect(normalizeGnoConnectRpc('   ')).toBe('');
  });
});
