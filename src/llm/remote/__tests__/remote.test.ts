import { generateText, Output, type LanguageModel } from 'ai';
import { z } from 'zod';
import { DEFAULT_REMOTE_CONTEXT_TOKENS, REMOTE_MODEL, type RemoteLlmOptions } from '../config';
import { createRemoteModel } from '../createModel';
import { createLLMRemote } from '../llmRemote';

const options = (patch: Partial<RemoteLlmOptions> = {}): RemoteLlmOptions => ({ apiKey: 'sk-test', ...patch });

const jsonResponse = (value: unknown) => new Response(JSON.stringify({
  id: 'response-test',
  model: REMOTE_MODEL,
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
  it('sends the key as a Bearer token to the OpenAI Responses API, asking for the fixed model', async () => {
    const { url, headers, body } = await sentRequest(createRemoteModel(options()));

    expect(url).toBe('https://api.openai.com/v1/responses');
    expect(headers.get('authorization')).toBe('Bearer sk-test');
    expect(body.model).toBe(REMOTE_MODEL);
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
  it('reports the given context size, else the remote default', () => {
    expect(createLLMRemote(options()).contextTokens).toBe(DEFAULT_REMOTE_CONTEXT_TOKENS);
    expect(createLLMRemote(options({ contextTokens: 200_000 })).contextTokens).toBe(200_000);
  });
});
