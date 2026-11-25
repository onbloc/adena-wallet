import { resolveLlmSettings } from '../llmSettings';

describe('resolveLlmSettings', () => {
  it('needs nothing for the on-device model', () => {
    expect(resolveLlmSettings('device', '')).toEqual({ remote: null, keyError: null });
  });

  it('builds options with the trimmed key and the given fetch', () => {
    const fetch = jest.fn() as unknown as typeof globalThis.fetch;

    expect(resolveLlmSettings('openai', ' sk-1\n', { fetch }).remote).toEqual({ apiKey: 'sk-1', fetch });
  });

  it.each(['', '  '])('requires a key (%j) and gives no options without it', (key) => {
    expect(resolveLlmSettings('openai', key)).toEqual({ remote: null, keyError: 'Required.' });
  });
});
