import { generateText, Output, type LanguageModel } from 'ai';
import { z } from 'zod';
import { OPENAI_MODELS } from '../catalog';
import { DEFAULT_REMOTE_CONTEXT_TOKENS, DEFAULT_REMOTE_MODEL, type RemoteLlmOptions } from '../config';
import { createRemoteModel } from '../createModel';
import { createLLMRemote } from '../llmRemote';

const options = (patch: Partial<RemoteLlmOptions> = {}): RemoteLlmOptions => ({ apiKey: 'sk-test', ...patch });

const jsonResponse = (value: unknown) => new Response(JSON.stringify({
  id: 'response-test',
  model: DEFAULT_REMOTE_MODEL,
  output: [{
    type: 'message',
    role: 'assistant',
    id: 'message-test',
    content: [{ type: 'output_text', text: JSON.stringify(value), annotations: [] }],
  }],
}), { headers: { 'content-type': 'application/json' } });

// Calls the model once against a stubbed fetch; returns the request it sent.
async function sentRequest(model: LanguageModel, callOptions: Record<string, unknown> = {}) {
  const fetchMock = jest
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response('{}', { headers: { 'content-type': 'application/json' } }));
  try {
    // The response shape is irrelevant here, only the request.
    await Promise.resolve(
      (model as Exclude<LanguageModel, string>).doGenerate({
        prompt: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
        ...callOptions,
      })
    ).catch(() => undefined);
    const [url, init] = fetchMock.mock.calls[0];
    return { url: String(url), headers: new Headers(init?.headers), body: JSON.parse(String(init?.body)) };
  } finally {
    fetchMock.mockRestore();
  }
}

describe('createRemoteModel', () => {
  it('sends the key as a Bearer token to the OpenAI Responses API, asking for the default model', async () => {
    const { url, headers, body } = await sentRequest(createRemoteModel(options()));

    expect(url).toBe('https://api.openai.com/v1/responses');
    expect(headers.get('authorization')).toBe('Bearer sk-test');
    expect(body.model).toBe(DEFAULT_REMOTE_MODEL);
  });

  it.each(['gpt-5.4', 'gpt-5.6', 'gpt-5.4-mini-2026-03-17'])('asks for the model it was given, alias and snapshot included: %s', async model => {
    const { body } = await sentRequest(createRemoteModel(options({ model })));

    expect(body.model).toBe(model);
  });

  it('rejects a model that is not in the catalog, naming what is supported', () => {
    expect(() => createRemoteModel(options({ model: 'gpt-9' }))).toThrow(/Unknown OpenAI model "gpt-9".*gpt-6-luna/);
  });

  it.each([
    ['gpt-5.5-pro', /no streaming/],
    ['gpt-5.4-pro', /no structured outputs/],
    ['gpt-image-2.6-sunburst', /Image generation/],
  ])('rejects %s with the reason it cannot run the agent', (model, reason) => {
    expect(() => createRemoteModel(options({ model }))).toThrow(reason);
  });

  describe.each(OPENAI_MODELS)('$id', model => {
    const call = { reasoning: 'none', temperature: 0.2, topP: 0.9, maxOutputTokens: 512 } as const;

    it('sends only the reasoning effort and sampling the model accepts', async () => {
      const { body } = await sentRequest(createRemoteModel(options({ model: model.id })), call);

      if (!model.reasoning.supported) {
        expect(body.reasoning?.effort).toBeUndefined();
        expect(body.temperature).toBe(0.2);
        return;
      }
      expect(model.reasoning.efforts).toContain(body.reasoning.effort);
      // The lowest effort stands in for none on a model that always reasons.
      expect(body.reasoning.effort).toBe(model.reasoning.efforts.includes('none') ? 'none' : model.reasoning.efforts[0]);
      if (body.reasoning.effort !== 'none') {
        expect(body.temperature).toBeUndefined();
        expect(body.top_p).toBeUndefined();
      }
    });

    it('leaves the effort to the model, and drops sampling, when asked for the provider default', async () => {
      const { body } = await sentRequest(createRemoteModel(options({ model: model.id })), { ...call, reasoning: 'provider-default' });

      expect(body.reasoning?.effort).toBeUndefined();
      if (model.reasoning.supported && model.reasoning.default !== 'none') expect(body.temperature).toBeUndefined();
    });

    it('refuses more output tokens than the model has, before calling the API', async () => {
      const fetchMock = jest.spyOn(globalThis, 'fetch');
      try {
        const generation = (createRemoteModel(options({ model: model.id })) as Exclude<LanguageModel, string>).doGenerate({
          prompt: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
          maxOutputTokens: model.maxOutputTokens + 1,
        });
        await expect(Promise.resolve(generation)).rejects.toThrow(RangeError);
        expect(fetchMock).not.toHaveBeenCalled();
      } finally {
        fetchMock.mockRestore();
      }
    });
  });

  it('ignores OPENAI_BASE_URL so the key only goes to OpenAI', async () => {
    process.env.OPENAI_BASE_URL = 'https://evil.example/v1';
    try {
      const { url } = await sentRequest(createRemoteModel(options()));
      expect(url).toBe('https://api.openai.com/v1/responses');
    } finally {
      delete process.env.OPENAI_BASE_URL;
    }
  });

  it.each(['oneOf', 'anyOf'])('uses JSON mode only for unsupported root %s and sends the schema as instructions', async keyword => {
    const union = {
      [keyword]: [
        { type: 'object', properties: { route: { const: 'chat' } }, required: ['route'] },
        { type: 'object', properties: { route: { const: 'lookup' } }, required: ['route'] },
      ],
    };

    const { body } = await sentRequest(createRemoteModel(options()), { responseFormat: { type: 'json', schema: union } });

    expect(body.text.format).toEqual({ type: 'json_object' });
    const instructions = body.input
      .filter((message: { role: string }) => message.role === 'system' || message.role === 'developer')
      .map((message: { content: string | { text: string }[] }) =>
        typeof message.content === 'string' ? message.content : message.content.map(part => part.text).join(''))
      .join('\n');
    expect(instructions).toContain(JSON.stringify(union));
    expect(body.input).toEqual(expect.arrayContaining([expect.objectContaining({ role: 'user' })]));
  });

  it('keeps a schema-only greeting structured instead of downgrading every object to JSON mode', async () => {
    const schema = z.strictObject({ greeting: z.string(), result: z.literal('ok') });
    const fetch = jest.fn().mockImplementation(async () => jsonResponse({ greeting: 'Hello', result: 'ok' }));

    const response = await generateText({
      model: createRemoteModel(options({ fetch })),
      prompt: 'hi',
      output: Output.object({ schema }),
    });

    expect(response.output).toEqual({ greeting: 'Hello', result: 'ok' });
    const body = JSON.parse(String(fetch.mock.calls[0][1].body));
    expect(body.text.format).toMatchObject({
      type: 'json_schema',
      strict: true,
      schema: {
        type: 'object',
        properties: { greeting: { type: 'string' }, result: { type: 'string', const: 'ok' } },
        required: ['greeting', 'result'],
        additionalProperties: false,
      },
    });
  });

  it('returns an unwrapped root-union result and keeps the original schema available to the model', async () => {
    const schema = z.discriminatedUnion('route', [
      z.strictObject({ route: z.literal('chat'), answer: z.string() }),
      z.strictObject({ route: z.literal('lookup'), query: z.string() }),
    ]);
    const fetch = jest.fn().mockImplementation(async () => jsonResponse({ route: 'chat', answer: 'Hello' }));

    const response = await generateText({
      model: createRemoteModel(options({ fetch })),
      system: 'Keep the answer brief.',
      prompt: 'hi',
      output: Output.object({ schema }),
    });

    expect(response.output).toEqual({ route: 'chat', answer: 'Hello' });
    const body = JSON.parse(String(fetch.mock.calls[0][1].body));
    expect(body.text.format).toEqual({ type: 'json_object' });
    const guidance = body.input
      .filter((message: { role: string }) => message.role === 'system' || message.role === 'developer')
      .map((message: { content: string | { text: string }[] }) =>
        typeof message.content === 'string' ? message.content : message.content.map(part => part.text).join(''))
      .join('\n');
    expect(guidance).toContain('Keep the answer brief.');
    expect(guidance).toContain('"answer"');
    expect(guidance).toContain('"query"');
  });

  it('still rejects JSON-mode union output that fails final client-side validation', async () => {
    const schema = z.discriminatedUnion('route', [
      z.strictObject({ route: z.literal('chat'), answer: z.string() }),
      z.strictObject({ route: z.literal('lookup'), query: z.string() }),
    ]);
    const fetch = jest.fn().mockImplementation(async () => jsonResponse({ route: 'chat' }));

    await expect(generateText({
      model: createRemoteModel(options({ fetch })),
      prompt: 'hi',
      output: Output.object({ schema }),
    })).rejects.toThrow();
  });

  it('drops Unicode-escape patterns, which OpenAI rejects, from tool schemas and keeps the others', async () => {
    const properties = {
      symbol: { type: 'string', pattern: '^[\\p{L}\\p{N}._-]+$' },
      digits: { type: 'string', pattern: '^\\d{1,78}$' },
    };
    const inputSchema = { type: 'object', properties, required: ['symbol', 'digits'], additionalProperties: false };

    const { body } = await sentRequest(createRemoteModel(options()), {
      tools: [{ type: 'function', name: 'get_balance', description: 'balance', inputSchema }],
    });

    const sent = body.tools[0].parameters.properties;
    expect(sent.symbol).not.toHaveProperty('pattern');
    expect(sent.digits.pattern).toBe('^\\d{1,78}$');
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
  it('reports the given context size, else the model window capped at the remote default', () => {
    expect(createLLMRemote(options()).contextTokens).toBe(DEFAULT_REMOTE_CONTEXT_TOKENS);
    expect(createLLMRemote(options({ contextTokens: 200_000 })).contextTokens).toBe(200_000);
    expect(createLLMRemote(options({ model: 'gpt-4o' })).contextTokens).toBe(128_000);
  });

  it('allows up to the model window and no more', () => {
    expect(createLLMRemote(options({ contextTokens: 1_050_000 })).contextTokens).toBe(1_050_000);
    expect(() => createLLMRemote(options({ contextTokens: 1_050_001 }))).toThrow(RangeError);
    expect(() => createLLMRemote(options({ model: 'gpt-4o', contextTokens: 128_001 }))).toThrow(RangeError);
  });

  it('is remote whatever the model', () => {
    expect(createLLMRemote(options({ model: 'gpt-oss-20b' })).kind).toBe('remote');
  });
});
