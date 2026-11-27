import type { LanguageModel } from 'ai';
import { DEFAULT_REMOTE_CONTEXT_TOKENS, RemoteProvider, type RemoteProviderOptions } from '../config';
import { createRemoteModel } from '../createModel';
import { createLLMRemote } from '../llmRemote';

const options = (patch: Partial<RemoteProviderOptions> = {}): RemoteProviderOptions => ({
  provider: RemoteProvider.Anthropic,
  apiKey: 'sk-test',
  model: 'claude-test',
  ...patch,
});

// Calls the model once against a stubbed fetch; returns the request it sent.
async function sentRequest(model: LanguageModel, responseBody: unknown) {
  const fetchMock = jest
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response(JSON.stringify(responseBody), { headers: { 'content-type': 'application/json' } }));
  try {
    // The body shape is irrelevant here, only the request.
    await Promise.resolve(
      (model as Exclude<LanguageModel, string>).doGenerate({
        prompt: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
      })
    ).catch(() => undefined);
    const [url, init] = fetchMock.mock.calls[0];
    return { url: String(url), headers: new Headers(init?.headers) };
  } finally {
    fetchMock.mockRestore();
  }
}

describe('createRemoteModel', () => {
  it('sends the Anthropic key as x-api-key, not in the URL', async () => {
    const { url, headers } = await sentRequest(createRemoteModel(options()), {});

    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(headers.get('x-api-key')).toBe('sk-test');
  });

  it('sends the OpenAI key as a Bearer token to the Responses API', async () => {
    const { url, headers } = await sentRequest(
      createRemoteModel(options({ provider: RemoteProvider.OpenAI, model: 'gpt-5-codex' })),
      {}
    );

    expect(url).toBe('https://api.openai.com/v1/responses');
    expect(headers.get('authorization')).toBe('Bearer sk-test');
  });

  it('sends an openai-compatible key to the given baseURL', async () => {
    const { url, headers } = await sentRequest(
      createRemoteModel(options({ provider: RemoteProvider.OpenAICompatible, baseURL: 'https://proxy.test/v1' })),
      {}
    );

    expect(url).toBe('https://proxy.test/v1/chat/completions');
    expect(headers.get('authorization')).toBe('Bearer sk-test');
  });

  it('honours a baseURL override for a named provider', async () => {
    const { url } = await sentRequest(createRemoteModel(options({ baseURL: 'https://proxy.test/v1' })), {});

    expect(url).toBe('https://proxy.test/v1/messages');
  });

  it.each(['', '   '])('rejects an empty apiKey (%j) instead of going keyless', (apiKey) => {
    expect(() => createRemoteModel(options({ apiKey }))).toThrow('apiKey is empty');
  });

  it('rejects an empty model', () => {
    expect(() => createRemoteModel(options({ model: ' ' }))).toThrow('model is empty');
  });

  it('requires a baseURL for openai-compatible', () => {
    expect(() => createRemoteModel(options({ provider: RemoteProvider.OpenAICompatible }))).toThrow('baseURL is required');
  });

  it('rejects an unknown provider', () => {
    expect(() => createRemoteModel(options({ provider: 'nope' as RemoteProvider }))).toThrow('Unknown remote provider');
  });
});

describe('createLLMRemote', () => {
  it('reports the given context size, else the remote default', () => {
    expect(createLLMRemote(options()).contextTokens).toBe(DEFAULT_REMOTE_CONTEXT_TOKENS);
    expect(createLLMRemote(options({ contextTokens: 200_000 })).contextTokens).toBe(200_000);
  });
});
