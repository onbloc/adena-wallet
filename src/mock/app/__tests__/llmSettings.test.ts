import { resolveLlmSettings } from '../llmSettings';

describe('resolveLlmSettings', () => {
  it('needs nothing for the on-device model', () => {
    expect(resolveLlmSettings('device', '', '', '')).toEqual({
      remote: null,
      modelError: null,
      keyError: null,
      baseUrlError: null,
    });
  });

  it('builds trimmed provider options once model and key are set', () => {
    const fetch = jest.fn() as unknown as typeof globalThis.fetch;

    const result = resolveLlmSettings('anthropic', ' claude-x ', ' sk-1\n', '', { fetch });

    expect(result.remote).toEqual({ provider: 'anthropic', model: 'claude-x', apiKey: 'sk-1', baseURL: undefined, fetch });
  });

  it('requires model and key, and gives no options while either is missing', () => {
    expect(resolveLlmSettings('openai', ' ', 'k', '')).toMatchObject({ remote: null, modelError: 'Required.', keyError: null });
    expect(resolveLlmSettings('openai', 'm', '  ', '')).toMatchObject({ remote: null, modelError: null, keyError: 'Required.' });
  });

  it('requires a Base URL for openai-compatible only', () => {
    expect(resolveLlmSettings('openai-compatible', 'm', 'k', '').baseUrlError).toBe('Required.');
    expect(resolveLlmSettings('openai', 'm', 'k', '').baseUrlError).toBeNull();
  });

  it('accepts an https Base URL', () => {
    const result = resolveLlmSettings('openai-compatible', 'm', 'k', ' https://proxy.test/v1 ');

    expect(result.remote).toMatchObject({ baseURL: 'https://proxy.test/v1' });
  });

  it.each([
    ['not a url', 'Must be a URL.'],
    ['http://proxy.test/v1', 'Must be https.'],
    ['ftp://proxy.test/v1', 'Must be https.'],
    ['https://user:pw@proxy.test/v1', 'Must not contain credentials.'],
  ])('rejects Base URL %p so the key is never sent in the clear', (url, error) => {
    const result = resolveLlmSettings('openai-compatible', 'm', 'k', url);

    expect(result).toMatchObject({ remote: null, baseUrlError: error });
  });

  it('allows loopback http only when the dev flag is set', () => {
    const url = 'http://127.0.0.1:8089/v1';

    expect(resolveLlmSettings('openai-compatible', 'm', 'k', url).baseUrlError).toBe('Must be https.');
    expect(resolveLlmSettings('openai-compatible', 'm', 'k', url, { allowLoopbackHttp: true }).baseUrlError).toBeNull();
    expect(
      resolveLlmSettings('openai-compatible', 'm', 'k', 'http://example.com/v1', { allowLoopbackHttp: true }).baseUrlError
    ).toBe('Must be https.');
  });
});
