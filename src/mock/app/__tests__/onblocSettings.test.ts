import {
  DEFAULT_ONBLOC_ACCOUNT,
  DEFAULT_ONBLOC_MCP_URL,
  resolveOnblocSettings,
} from '../onblocSettings';

describe('resolveOnblocSettings', () => {
  it('accepts the defaults', () => {
    expect(resolveOnblocSettings(DEFAULT_ONBLOC_MCP_URL, DEFAULT_ONBLOC_ACCOUNT)).toEqual({
      enabled: true,
      endpoint: DEFAULT_ONBLOC_MCP_URL,
      account: DEFAULT_ONBLOC_ACCOUNT,
      endpointError: null,
      accountError: null,
    });
  });

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
    expect(resolveOnblocSettings(url, DEFAULT_ONBLOC_ACCOUNT, true).endpointError).toBeNull();
  });

  it.each(['alice', 'G1' + DEFAULT_ONBLOC_ACCOUNT.slice(2), DEFAULT_ONBLOC_ACCOUNT.slice(0, -1)])(
    'rejects address %p',
    (account) => {
      expect(resolveOnblocSettings(DEFAULT_ONBLOC_MCP_URL, account).accountError).not.toBeNull();
    }
  );
});
