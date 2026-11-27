import {
  DEFAULT_ONBLOC_ACCOUNT,
  DEFAULT_ONBLOC_MCP_URL,
  resolveOnblocSettings,
} from '../onblocSettings';

describe('resolveOnblocSettings', () => {
  it('accepts a host-configured network without changing its identity', () => {
    expect(resolveOnblocSettings('https://test.example/mcp', DEFAULT_ONBLOC_ACCOUNT, 'onyx-1')).toMatchObject({
      enabled: true, endpoint: 'https://test.example/mcp', chainId: 'onyx-1', chainIdError: null,
    });
  });

  it.each(['', ' ', ' onyx-1', 'onyx-1 ', 'onyx\n1', 'a'.repeat(129)])(
    'rejects malformed chain %p', (chainId) => {
      expect(resolveOnblocSettings(DEFAULT_ONBLOC_MCP_URL, DEFAULT_ONBLOC_ACCOUNT, chainId).chainIdError).not.toBeNull();
    }
  );

  it('trims input', () => {
    const result = resolveOnblocSettings(` ${DEFAULT_ONBLOC_MCP_URL} `, ` ${DEFAULT_ONBLOC_ACCOUNT}\n`);

    expect(result).toMatchObject({
      endpoint: DEFAULT_ONBLOC_MCP_URL,
      account: DEFAULT_ONBLOC_ACCOUNT,
      endpointError: null,
      accountError: null,
    });
  });

  it('falls back to the mock wallet when both fields are empty', () => {
    expect(resolveOnblocSettings('  ', '')).toMatchObject({
      enabled: false,
      endpointError: null,
      accountError: null,
    });
  });

  it('requires both fields once one is set', () => {
    expect(resolveOnblocSettings('', DEFAULT_ONBLOC_ACCOUNT)).toMatchObject({
      enabled: true,
      endpointError: 'Required.',
      accountError: null,
    });
    expect(resolveOnblocSettings(DEFAULT_ONBLOC_MCP_URL, '').accountError).not.toBeNull();
  });

  it.each([
    'not a url',
    'http://dev-gnoscan-v2.api.onbloc.xyz/mcp',
    'https://dev-gnoscan-v2.api.onbloc.xyz/other',
    'https://dev-gnoscan-v2.api.onbloc.xyz/mcp?x=1',
    'https://user:pw@dev-gnoscan-v2.api.onbloc.xyz/mcp',
  ])('rejects endpoint %p', (endpoint) => {
    expect(resolveOnblocSettings(endpoint, DEFAULT_ONBLOC_ACCOUNT).endpointError).not.toBeNull();
  });

  it('allows loopback http only when the simulator flag is set', () => {
    const url = 'http://127.0.0.1:8080/mcp';

    expect(resolveOnblocSettings(url, DEFAULT_ONBLOC_ACCOUNT).endpointError).not.toBeNull();
    expect(resolveOnblocSettings(url, DEFAULT_ONBLOC_ACCOUNT, undefined, true).endpointError).toBeNull();
  });

  it.each(['alice', 'G1' + DEFAULT_ONBLOC_ACCOUNT.slice(2), DEFAULT_ONBLOC_ACCOUNT.slice(0, -1)])(
    'rejects address %p',
    (account) => {
      expect(resolveOnblocSettings(DEFAULT_ONBLOC_MCP_URL, account).accountError).not.toBeNull();
    }
  );
});
