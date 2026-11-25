import type { LanguageModel } from 'ai';
import { DEFAULT_REMOTE_CONTEXT_TOKENS, REMOTE_MODEL, type RemoteLlmOptions } from '../config';
import { createRemoteModel } from '../createModel';
import { createLLMRemote } from '../llmRemote';

const options = (patch: Partial<RemoteLlmOptions> = {}): RemoteLlmOptions => ({ apiKey: 'sk-test', ...patch });

// Calls the model once against a stubbed fetch; returns the request it sent.
async function sentRequest(model: LanguageModel) {
  const fetchMock = jest
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response('{}', { headers: { 'content-type': 'application/json' } }));
  try {
    // The response shape is irrelevant here, only the request.
    await Promise.resolve(
      (model as Exclude<LanguageModel, string>).doGenerate({
        prompt: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
      })
    ).catch(() => undefined);
    const [url, init] = fetchMock.mock.calls[0];
    return { url: String(url), headers: new Headers(init?.headers), body: JSON.parse(String(init?.body)) };
  } finally {
    fetchMock.mockRestore();
  }
}

describe('createRemoteModel', () => {
  it('sends the key as a Bearer token to the OpenAI Responses API, asking for the fixed model', async () => {
    const { url, headers, body } = await sentRequest(createRemoteModel(options()));

    expect(url).toBe('https://api.openai.com/v1/responses');
    expect(headers.get('authorization')).toBe('Bearer sk-test');
    expect(body.model).toBe(REMOTE_MODEL);
  });

  it('sends requests through the fetch it was given, not the global one', async () => {
    const global = jest.spyOn(globalThis, 'fetch');
    const custom = jest.fn().mockResolvedValue(new Response('{}', { headers: { 'content-type': 'application/json' } }));
    try {
      await Promise.resolve(
        (createRemoteModel(options({ fetch: custom })) as Exclude<LanguageModel, string>).doGenerate({
          prompt: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
        })
      ).catch(() => undefined);

      expect(custom).toHaveBeenCalledTimes(1);
      expect(global).not.toHaveBeenCalled();
    } finally {
      global.mockRestore();
    }
  });

  it.each(['', '   '])('rejects an empty apiKey (%j) instead of going keyless', (apiKey) => {
    expect(() => createRemoteModel(options({ apiKey }))).toThrow('apiKey is empty');
  });
});

describe('createLLMRemote', () => {
  it('reports the given context size, else the remote default', () => {
    expect(createLLMRemote(options()).contextTokens).toBe(DEFAULT_REMOTE_CONTEXT_TOKENS);
    expect(createLLMRemote(options({ contextTokens: 200_000 })).contextTokens).toBe(200_000);
  });
});
