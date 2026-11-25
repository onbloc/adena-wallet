import { simulateStreamingMiddleware, tool, wrapLanguageModel } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';
import { z } from 'zod';

import { Harness, type RemoteTool } from '../../harness/core';
import { createOnblocToolSource } from '../../harness/mcp';
import { fakeOnblocMcp } from '../../harness/mcp/testing/fakeOnblocMcp';
import { createChatSession, GenerateEventType, LLMFromModel, type GenerateEvent, type LLM } from '../../llm/core';
import { AIAgent } from '../agent';
import { intentReplyText } from '../testing/intentReply';
import { ACCOUNT, RECIPIENT, fakeWallet } from '../testing/fakeWallet';

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

// Every turn is a classification call followed by the answer call.
function setup(answers = ['First answer', 'Follow-up answer']) {
  const model = new MockLanguageModelV4({
    doGenerate: answers.flatMap((answer) => [reply(intentReplyText({ kind: 'explanation' })), reply(answer)]),
  });
  const llm = new LLMFromModel(wrapLanguageModel({ model, middleware: simulateStreamingMiddleware() }));
  return { agent: new AIAgent({ llm, harness: new Harness(), wallet: fakeWallet(), onTransaction: jest.fn() }), model, llm };
}

describe('agent conversations', () => {
  it('continues a restored conversation without the caller assembling any messages', async () => {
    const { agent, model } = setup();
    const first = agent.createConversation({ account: ACCOUNT });
    await collect(first.run({ prompt: 'Remember that the recipient is Carol.' }));
    const restored = agent.createConversation({ account: ACCOUNT, saved: first.serialize() });

    await collect(restored.run({ prompt: 'Who is the recipient?' }));

    const prompt = JSON.stringify(model.doGenerateCalls[3].prompt);
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
    session.complete('obsolete topic', 'x'.repeat(20000));
    session.complete('The recipient is Carol.', 'I will use Carol.');
    const conversation = agent.createConversation({ account: ACCOUNT, session, contextTokens: 6144 });
    const current = 'Which recipient did I just name?';

    await collect(conversation.run({ prompt: current, maxOutputTokens: 128 }));

    const firstPrompt = JSON.stringify(model.doGenerateCalls[1].prompt);
    expect(firstPrompt).not.toContain('obsolete topic');
    expect(firstPrompt).toContain('The recipient is Carol.');
    expect(firstPrompt).toContain(current);
    expect(conversation.turns.map((turn) => turn.prompt)).toEqual(['The recipient is Carol.', current]);
    expect(conversation.serialize()).not.toContain('obsolete topic');
    await collect(conversation.run({ prompt: 'Continue.', maxOutputTokens: 128 }));
    expect(JSON.stringify(model.doGenerateCalls[3].prompt)).not.toContain('obsolete topic');
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
      { name: 'get_nfts_balance', output: { address: ACCOUNT, items: [{ tokenId: 'nft-1' }] } },
      { name: 'list_account_transactions', output: { address: ACCOUNT, items: [{ hash: 'tx-123' }] } },
    ]);
    const model = new MockLanguageModelV4({ doGenerate: [
      reply(intentReplyText({ kind: 'lookup', requests: [{ target: 'other', query: 'Inspect NFTs and recent transactions.' }] })),
      reply(JSON.stringify({ toolNames: ['get_nfts_balance', 'list_account_transactions'] })),
      {
        content: [{ type: 'tool-call', toolCallId: 'current-read', toolName: 'get_nfts_balance', input: '{}' }],
        finishReason: { unified: 'tool-calls', raw: 'tool-calls' }, usage, warnings: [],
      },
      {
        content: [{ type: 'tool-call', toolCallId: 'history', toolName: 'list_account_transactions', input: '{"limit":5}' }],
        finishReason: { unified: 'tool-calls', raw: 'tool-calls' }, usage, warnings: [],
      },
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

    const prompt = JSON.stringify(model.doGenerateCalls[3].prompt);
    expect(prompt).not.toContain('obsolete topic');
    expect(prompt).toContain('Send one to Carol.');
    expect(prompt).toContain('current-read');
    expect(prompt).toContain('nft-1');
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
      reply(intentReplyText({ kind: 'lookup', requests: [{ target: 'balance', request: { kind: 'all' } }] })),
      reply(intentReplyText({ kind: 'explanation' })),
      reply(correction),
      reply(intentReplyText({ kind: 'lookup', requests: [{ target: 'balance', request: { kind: 'one', asset: { kind: 'symbol', value: 'GNOT' } } }] })),
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
      reply(intentReplyText({ kind: 'lookup', requests: [{ target: 'other', query: 'Look up current data and its status.' }] })),
      reply(JSON.stringify({ toolNames: ['lookup', 'status'] })),
      {
        content: [{ type: 'tool-call', toolCallId: 'lookup-now', toolName: 'lookup', input: '{}' }],
        finishReason: { unified: 'tool-calls', raw: 'tool-calls' }, usage, warnings: [],
      },
      {
        content: [{ type: 'tool-call', toolCallId: 'status-now', toolName: 'status', input: '{}' }],
        finishReason: { unified: 'tool-calls', raw: 'tool-calls' }, usage, warnings: [],
      },
    ] });
    const llm = new LLMFromModel(wrapLanguageModel({ model, middleware: simulateStreamingMiddleware() }));
    const harness = new Harness({ toolSources: [async () => new Map<string, RemoteTool>([[
      'lookup',
      {
        definition: { name: 'lookup', description: 'Look up data', jsonSchema: { type: 'object', properties: {} } },
        execute: async () => ({ kind: 'result', value: { data: 'data'.repeat(3000) } }),
      },
    ], [
      'status',
      {
        definition: { name: 'status', description: 'Read current status', jsonSchema: { type: 'object', properties: {} } },
        execute: async () => ({ kind: 'result', value: { status: 'complete' } }),
      },
    ]])] });
    const agent = new AIAgent({ llm, harness, wallet: fakeWallet(), onTransaction: jest.fn() });
    const session = createChatSession();
    session.complete('obsolete topic', 'x'.repeat(12000));
    session.complete('recent topic', 'r'.repeat(2500));
    const conversation = agent.createConversation({ account: ACCOUNT, session, contextTokens: 8192 });

    await collect(conversation.run({ prompt: 'Look up current data.', system: 'Be concise.', maxOutputTokens: 128 }));

    expect(JSON.stringify(model.doGenerateCalls[2].prompt)).toContain('recent topic');
    const continuation = JSON.stringify(model.doGenerateCalls[3].prompt);
    expect(continuation).not.toContain('recent topic');
    expect(continuation).toContain('lookup-now');
    expect(continuation).toContain('data'.repeat(3000));
    expect(conversation.turns.map((turn) => turn.prompt)).toEqual(['Look up current data.']);
    expect(conversation.serialize()).not.toContain('recent topic');
  });

  it.each([undefined, false, true])('forwards transaction preparation opt-in %s to every conversation turn', async (enabled) => {
    const mcp = fakeOnblocMcp([
      { name: 'get_native_balance', output: { address: ACCOUNT, denom: 'ugnot', balance: '10000000' } },
    ]);
    const transfer = reply(JSON.stringify({ operation: 'transfer', recipient: RECIPIENT,
      asset: { kind: 'symbol', value: 'GNOT' }, amount: { kind: 'exact', value: '1' } }));
    const classification = reply(intentReplyText({ kind: 'prepare' }));
    const model = new MockLanguageModelV4({ doGenerate: enabled
      ? [classification, transfer, classification, transfer] : [classification, classification] });
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

    await collect(conversation.run({ prompt: `Send 1 GNOT to ${RECIPIENT}.` }));
    await collect(conversation.run({ prompt: `Send 1 GNOT to ${RECIPIENT} again.` }));

    expect(wallet.calls).toHaveLength(enabled ? 2 : 0);
    expect(handoff).toHaveBeenCalledTimes(enabled ? 2 : 0);
    expect(wallet.calls).toEqual(enabled ? [
      { method: 'transfer', params: { from: ACCOUNT, to: RECIPIENT, amount: '1', token: 'GNOT' } },
      { method: 'transfer', params: { from: ACCOUNT, to: RECIPIENT, amount: '1', token: 'GNOT' } },
    ] : []);
    expect(model.doGenerateCalls).toHaveLength(enabled ? 4 : 2);
    expect(mcp.calls).toEqual([]);
  });

  it('does not expose or execute caller-provided tools in an explanation turn', async () => {
    const execute = jest.fn(async () => ({ secret: 'unexpected' }));
    const model = new MockLanguageModelV4({ doGenerate: [reply(intentReplyText({ kind: 'explanation' })), reply('Done')] });
    const llm = new LLMFromModel(wrapLanguageModel({ model, middleware: simulateStreamingMiddleware() }));
    const conversation = new AIAgent({ llm, harness: new Harness(), wallet: fakeWallet(), onTransaction: jest.fn() })
      .createConversation({ account: ACCOUNT });

    await collect(conversation.run({
      prompt: 'Try the supplied tool.', maxSteps: 3,
      tools: { caller_tool: tool({ inputSchema: z.object({}), execute }) },
    }));

    expect(model.doGenerateCalls).toHaveLength(2);
    for (const call of model.doGenerateCalls) expect(call.tools ?? []).toEqual([]);
    expect(execute).not.toHaveBeenCalled();
  });

  it.each([0, -1, 1.5, NaN, Infinity, 8193])('rejects a context budget outside the model limits: %p', (contextTokens) => {
    expect(() => setup().agent.createConversation({ account: ACCOUNT, contextTokens })).toThrow(RangeError);
  });

  it('does not allow overlapping turns or a late result to repopulate a reset conversation', async () => {
    const { promise: ready, resolve: started } = Promise.withResolvers<void>();
    const { promise: blocked, resolve: release } = Promise.withResolvers<void>();
    let calls = 0;
    const done = (text: string): GenerateEvent => ({ type: GenerateEventType.Done, metrics: { totalMs: 1, ttftMs: null },
      aborted: false, finishReason: 'stop', warnings: [], messages: [{ role: 'assistant', content: text }] });
    const llm: LLM = {
      contextTokens: 8192,
      // Even calls classify the request, odd calls answer it; the first answer blocks.
      async *generate() {
        if (calls++ % 2 === 0) {
          const route = intentReplyText({ kind: 'explanation' });
          yield { type: GenerateEventType.Text, delta: route };
          yield done(route);
          return;
        }
        started();
        await blocked;
        yield { type: GenerateEventType.Text, delta: 'Late answer' };
        yield done('Late answer');
      },
    };
    const conversation = new AIAgent({ llm, harness: new Harness(), wallet: fakeWallet(), onTransaction: jest.fn() })
      .createConversation({ account: ACCOUNT });
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
