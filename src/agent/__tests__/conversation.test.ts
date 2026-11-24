import { simulateStreamingMiddleware, tool, wrapLanguageModel } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';
import { z } from 'zod';

import { Harness, type RemoteTool } from '../../harness/core';
import { createOnblocToolSource } from '../../harness/mcp';
import { fakeOnblocMcp } from '../../harness/mcp/testing/fakeOnblocMcp';
import { createChatSession, GenerateEventType, LLMFromModel, type GenerateEvent, type LLM } from '../../llm/core';
import { AIAgent } from '../agent';
import { ACCOUNT, RECIPIENT, fakeWallet } from '../testing/fakeWallet';
import { ToolName } from '../wallet/constants';

const usage = {
  inputTokens: { total: 5, noCache: 5, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 5, text: 5, reasoning: undefined },
};
const reply = (text: string) => ({
  content: [{ type: 'text' as const, text }],
  finishReason: { unified: 'stop' as const, raw: 'stop' },
  usage,
  warnings: [],
});

async function collect(events: AsyncIterable<GenerateEvent>) {
  const out: GenerateEvent[] = [];
  for await (const event of events) out.push(event);
  return out;
}

function setup(answers = ['First answer', 'Follow-up answer']) {
  const model = new MockLanguageModelV4({ doGenerate: answers.map(reply) });
  const llm = new LLMFromModel(wrapLanguageModel({ model, middleware: simulateStreamingMiddleware() }));
  return { agent: new AIAgent({ llm, harness: new Harness() }), model, llm };
}

describe('agent conversations', () => {
  it('continues a restored conversation without the caller assembling any messages', async () => {
    const { agent, model } = setup();
    const first = agent.createConversation();
    await collect(first.run({ prompt: 'Remember that the recipient is Carol.' }));
    const restored = agent.createConversation({ saved: first.serialize() });

    await collect(restored.run({ prompt: 'Who is the recipient?' }));

    const prompt = JSON.stringify(model.doGenerateCalls[1].prompt);
    expect(prompt).toContain('Remember that the recipient is Carol.');
    expect(prompt).toContain('First answer');
    expect(prompt).toContain('Who is the recipient?');
    expect(restored.turns.map((turn) => turn.prompt)).toEqual([
      'Remember that the recipient is Carol.', 'Who is the recipient?',
    ]);
    expect(first.turns).toHaveLength(1);
  });

  it('removes old turns from persistent memory but preserves the recent turn and current request intact', async () => {
    const { agent, model } = setup();
    const session = createChatSession();
    session.complete('obsolete topic', 'x'.repeat(6000));
    session.complete('The recipient is Carol.', 'I will use Carol.');
    const conversation = agent.createConversation({ session, contextTokens: 2048 });
    const current = 'Which recipient did I just name?';

    await collect(conversation.run({ prompt: current, maxOutputTokens: 128 }));

    const firstPrompt = JSON.stringify(model.doGenerateCalls[0].prompt);
    expect(firstPrompt).not.toContain('obsolete topic');
    expect(firstPrompt).toContain('The recipient is Carol.');
    expect(firstPrompt).toContain(current);
    expect(conversation.turns.map((turn) => turn.prompt)).toEqual(['The recipient is Carol.', current]);
    expect(conversation.serialize()).not.toContain('obsolete topic');
    await collect(conversation.run({ prompt: 'Continue.', maxOutputTokens: 128 }));
    expect(JSON.stringify(model.doGenerateCalls[1].prompt)).not.toContain('obsolete topic');
  });

  it('rejects an oversized current request before any model or wallet access, without deleting history', async () => {
    const { llm, model } = setup();
    const source = jest.fn(async () => new Map());
    const wallet = fakeWallet();
    const agent = new AIAgent({ llm, harness: new Harness({ toolSources: [source] }), wallet, onTransaction: jest.fn() });
    const session = createChatSession();
    session.complete('kept question', 'kept answer');
    const conversation = agent.createConversation({ account: ACCOUNT, session, contextTokens: 1024 });

    await expect(collect(conversation.run({ prompt: 'x'.repeat(4000), maxOutputTokens: 128 }))).rejects.toThrow('ADENA_CONTEXT_LIMIT');

    expect(model.doGenerateCalls).toEqual([]);
    expect(source).not.toHaveBeenCalled();
    expect(wallet.calls).toEqual([]);
    expect(conversation.turns).toEqual([{ prompt: 'kept question', answer: 'kept answer' }]);
  });

  it('keeps the live tool exchange while pruning stored turns and never replays an earlier transfer', async () => {
    const mcp = fakeOnblocMcp([
      { name: 'get_native_balance', output: { address: ACCOUNT, denom: 'ugnot', balance: '10000000' } },
    ]);
    const model = new MockLanguageModelV4({ doGenerate: [
      {
        content: [{ type: 'tool-call', toolCallId: 'current-read', toolName: 'get_balance', input: JSON.stringify({
          kind: 'one', asset: { kind: 'symbol', value: 'GNOT' },
        }) }],
        finishReason: { unified: 'tool-calls', raw: 'tool-calls' }, usage, warnings: [],
      },
      reply('Current funds'),
    ] });
    const wallet = fakeWallet();
    const handoff = jest.fn();
    const agent = new AIAgent({
      llm: new LLMFromModel(wrapLanguageModel({ model, middleware: simulateStreamingMiddleware() })),
      harness: new Harness({ toolSources: [createOnblocToolSource({ endpoint: 'https://example.test/mcp', fetcher: mcp.fetcher })] }),
      wallet,
      onTransaction: handoff,
    });
    const session = createChatSession();
    session.complete('obsolete topic', 'x'.repeat(20000));
    session.complete('Send one to Carol.', 'An unsigned transaction was prepared.');
    const conversation = agent.createConversation({ account: ACCOUNT, session, contextTokens: 8192 });

    await collect(conversation.run({ prompt: 'Please inspect my funds.', maxOutputTokens: 128 }));

    const prompt = JSON.stringify(model.doGenerateCalls[1].prompt);
    expect(prompt).not.toContain('obsolete topic');
    expect(prompt).toContain('Send one to Carol.');
    expect(prompt).toContain('current-read');
    expect(prompt).toContain('10000000');
    expect(conversation.turns.map((turn) => turn.prompt)).toEqual(['Send one to Carol.', 'Please inspect my funds.']);
    expect(wallet.calls).toEqual([]);
    expect(handoff).not.toHaveBeenCalled();
  });

  it('remembers a wallet explanation between a portfolio lookup and a fresh native lookup', async () => {
    const native = { address: ACCOUNT, denom: 'ugnot', balance: '10000000' };
    const mcp = fakeOnblocMcp([
      { name: 'get_native_balance', output: native },
      { name: 'get_token_balances', output: { address: ACCOUNT, items: [] } },
    ]);
    const correction = 'GNOT is the native token; ugnot is its base unit.';
    const model = new MockLanguageModelV4({ doGenerate: [
      {
        content: [{ type: 'tool-call', toolCallId: 'portfolio', toolName: 'get_balance', input: JSON.stringify({ kind: 'all' }) }],
        finishReason: { unified: 'tool-calls', raw: 'tool-calls' }, usage, warnings: [],
      },
      reply('Initial funds'),
      reply(correction),
      {
        content: [{ type: 'tool-call', toolCallId: 'fresh-native', toolName: 'get_balance', input: JSON.stringify({
          kind: 'one', asset: { kind: 'symbol', value: 'GNOT' },
        }) }],
        finishReason: { unified: 'tool-calls', raw: 'tool-calls' }, usage, warnings: [],
      },
      reply('Current native balance'),
    ] });
    const wallet = fakeWallet();
    const handoff = jest.fn();
    const agent = new AIAgent({
      llm: new LLMFromModel(wrapLanguageModel({ model, middleware: simulateStreamingMiddleware() })),
      harness: new Harness({ toolSources: [createOnblocToolSource({ endpoint: 'https://example.test/mcp', fetcher: mcp.fetcher })] }),
      wallet, onTransaction: handoff,
    });
    const conversation = agent.createConversation({ account: ACCOUNT });
    await collect(conversation.run({ prompt: 'Show me all my assets.' }));

    const explanation = await collect(conversation.run({ prompt: 'Is native token the right term?' }));
    expect(explanation).toContainEqual({ type: GenerateEventType.Text, delta: correction });
    expect(conversation.turns.map((turn) => turn.prompt)).toEqual([
      'Show me all my assets.', 'Is native token the right term?',
    ]);
    native.balance = '2000000';
    const fresh = await collect(conversation.run({ prompt: 'Look up that native balance again.' }));

    expect(fresh).toContainEqual({ type: GenerateEventType.Text, delta: '2 GNOT' });
    expect(JSON.stringify(model.doGenerateCalls[3].prompt)).toContain(correction);
    expect(mcp.calls.filter((call) => call.name === 'get_native_balance')).toHaveLength(2);
    expect(conversation.turns).toHaveLength(3);
    expect(wallet.calls).toEqual([]);
    expect(handoff).not.toHaveBeenCalled();
  });

  it('persists additional history eviction when a tool result fills the next model step', async () => {
    const model = new MockLanguageModelV4({ doGenerate: [
      {
        content: [{ type: 'tool-call', toolCallId: 'lookup-now', toolName: 'lookup', input: '{}' }],
        finishReason: { unified: 'tool-calls', raw: 'tool-calls' }, usage, warnings: [],
      },
      reply('Lookup completed.'),
    ] });
    const llm = new LLMFromModel(wrapLanguageModel({ model, middleware: simulateStreamingMiddleware() }));
    const harness = new Harness({ toolSources: [async () => new Map<string, RemoteTool>([[
      'lookup',
      {
        definition: { name: 'lookup', description: 'Look up data', jsonSchema: { type: 'object', properties: {} } },
        execute: async () => ({ kind: 'result', value: { data: 'data'.repeat(300) } }),
      },
    ]])] });
    const agent = new AIAgent({ llm, harness });
    const session = createChatSession();
    session.complete('obsolete topic', 'x'.repeat(6000));
    session.complete('recent topic', 'r'.repeat(1800));
    const conversation = agent.createConversation({ account: ACCOUNT, session, contextTokens: 2000 });

    await collect(conversation.run({ prompt: 'Look up current data.', system: 'Be concise.', maxOutputTokens: 128 }));

    expect(JSON.stringify(model.doGenerateCalls[0].prompt)).toContain('recent topic');
    const continuation = JSON.stringify(model.doGenerateCalls[1].prompt);
    expect(continuation).not.toContain('recent topic');
    expect(continuation).toContain('lookup-now');
    expect(continuation).toContain('data'.repeat(300));
    expect(conversation.turns.map((turn) => turn.prompt)).toEqual(['Look up current data.']);
    expect(conversation.serialize()).not.toContain('recent topic');
  });

  it.each([undefined, false, true])('forwards transaction preparation opt-in %s to every conversation turn', async (enabled) => {
    const mcp = fakeOnblocMcp([
      { name: 'get_native_balance', output: { address: ACCOUNT, denom: 'ugnot', balance: '10000000' } },
    ]);
    const transfer = () => ({
      content: [{ type: 'tool-call' as const, toolCallId: 'transfer', toolName: ToolName.Transfer,
        input: JSON.stringify({ to: RECIPIENT, amount: '1', token: 'GNOT' }) }],
      finishReason: { unified: 'tool-calls' as const, raw: 'tool-calls' }, usage, warnings: [],
    });
    const model = new MockLanguageModelV4({ doGenerate: [transfer(), reply('Ready'), transfer(), reply('Ready')] });
    const wallet = fakeWallet();
    const handoff = jest.fn();
    const agent = new AIAgent({
      llm: new LLMFromModel(wrapLanguageModel({ model, middleware: simulateStreamingMiddleware() })),
      harness: new Harness({ toolSources: [createOnblocToolSource({ endpoint: 'https://example.test/mcp', fetcher: mcp.fetcher })] }),
      wallet, onTransaction: handoff,
    });
    const conversation = agent.createConversation({
      account: ACCOUNT, ...(enabled === undefined ? {} : { allowTransactionPreparation: enabled }),
    });

    await collect(conversation.run({ prompt: 'Send 1 GNOT.' }));
    await collect(conversation.run({ prompt: 'Send 1 GNOT again.' }));

    expect(wallet.calls).toHaveLength(enabled ? 2 : 0);
    expect(handoff).toHaveBeenCalledTimes(enabled ? 2 : 0);
  });

  it('does not expose or execute caller-provided tools in an accountless conversation', async () => {
    const execute = jest.fn(async () => ({ secret: 'unexpected' }));
    const model = new MockLanguageModelV4({ doGenerate: [reply('Done')] });
    const llm = new LLMFromModel(wrapLanguageModel({ model, middleware: simulateStreamingMiddleware() }));
    const conversation = new AIAgent({ llm, harness: new Harness() }).createConversation();

    await collect(conversation.run({
      prompt: 'Try the supplied tool.', maxSteps: 3,
      tools: { caller_tool: tool({ inputSchema: z.object({}), execute }) },
    }));

    expect(model.doGenerateCalls[0].tools ?? []).toEqual([]);
    expect(execute).not.toHaveBeenCalled();
  });

  it.each([0, -1, 1.5, NaN, Infinity, 8193])('rejects a context budget outside the model limits: %p', (contextTokens) => {
    expect(() => setup().agent.createConversation({ contextTokens })).toThrow(RangeError);
  });

  it('does not allow overlapping turns or a late result to repopulate a reset conversation', async () => {
    const { promise: ready, resolve: started } = Promise.withResolvers<void>();
    const { promise: blocked, resolve: release } = Promise.withResolvers<void>();
    const llm: LLM = {
      contextTokens: 8192,
      async *generate() {
        started();
        await blocked;
        yield { type: GenerateEventType.Text, delta: 'Late answer' };
        yield { type: GenerateEventType.Done, metrics: { totalMs: 1, ttftMs: null }, aborted: false,
          finishReason: 'stop', warnings: [], messages: [{ role: 'assistant', content: 'Late answer' }] };
      },
    };
    const conversation = new AIAgent({ llm, harness: new Harness() }).createConversation();
    const pending = collect(conversation.run({ prompt: 'Old request' }));
    await ready;

    await expect(collect(conversation.run({ prompt: 'Overlapping request' }))).rejects.toThrow('active turn');
    conversation.reset();
    release();
    await pending;

    expect(conversation.turns).toEqual([]);
    await collect(conversation.run({ prompt: 'After reset' }));
    expect(conversation.turns.map((turn) => turn.prompt)).toEqual(['After reset']);
  });
});
