import { act } from 'react';
import { AppState } from 'react-native';
import Storage from 'expo-sqlite/kv-store';
import { createRoot, type Root } from 'test-renderer';
import { simulateStreamingMiddleware, wrapLanguageModel } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';

import { AIAgent, WalletError, WalletErrorCode } from '../../../agent';
import { ACCOUNT, FRIEND, RECIPIENT, fakeWallet } from '../../../agent/testing/fakeWallet';
import { intentReplyText } from '../../../agent/testing/intentReply';
import { Harness } from '../../../harness/core';
import {
  chatSessionKey,
  createChatSession,
  GenerateEventType,
  LLMFromModel,
  type ChatScope,
  type ChatSession,
  type ChatTurn,
  type GenerateEvent,
  type LLM,
} from '../../../llm/core';
import { useChatSession, type ChatSessionState } from '../useChatSession';

jest.mock('expo-sqlite/kv-store', () => {
  const values = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (key: string) => values.get(key) ?? null),
      setItem: jest.fn(async (key: string, value: string) => { values.set(key, value); }),
      removeItem: jest.fn(async (key: string) => { values.delete(key); }),
      clear: jest.fn(async () => { values.clear(); }),
    },
  };
});

const plain: ChatScope = { mode: 'plain' };
const wallet: ChatScope = {
  mode: 'onbloc', endpoint: 'https://example.test/mcp', chainId: 'test-chain', account: ACCOUNT,
};
const other: ChatScope = { ...wallet, account: RECIPIENT };

function newAgent(llm: LLM, session: ChatSession | undefined) {
  return new AIAgent({ llm, harness: new Harness(), wallet: fakeWallet(), onTransaction: jest.fn(), session });
}

async function consume(events: AsyncIterable<GenerateEvent>, aborted = false) {
  for await (const event of events) {
    if (event.type === GenerateEventType.Done) expect(event.aborted).toBe(aborted);
  }
}

function blockedAgent(session: ChatSession | undefined) {
  let signal: AbortSignal | undefined;
  const { promise: ready, resolve: started } = Promise.withResolvers<void>();
  const { promise: blocked, resolve: release } = Promise.withResolvers<void>();
  let calls = 0;
  const llm: LLM = {
    contextTokens: 8192,
    async *generate(_settings, options) {
      signal = options?.signal;
      // The first call is the classification; it is the one held back.
      const first = calls++ === 0;
      const text = first ? intentReplyText({ kind: 'explanation' }) : 'Late answer';
      if (first) {
        started();
        await blocked;
      }
      // Deliberately deliver a late result even after cancellation.
      yield { type: GenerateEventType.Text, delta: text };
      yield {
        type: GenerateEventType.Done, aborted: false, finishReason: 'stop', warnings: [],
        messages: [{ role: 'assistant', content: text }], metrics: { totalMs: 1, ttftMs: null },
      };
    },
  };
  return { agent: newAgent(llm, session), ready, release, get signal() { return signal; } };
}

const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
const previousActEnvironment = actEnvironment.IS_REACT_ACT_ENVIRONMENT;

beforeAll(() => { actEnvironment.IS_REACT_ACT_ENVIRONMENT = true; });
afterAll(() => { actEnvironment.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment; });

describe('useChatSession', () => {
  let root: Root;
  let current: ChatSessionState;

  function Probe({ scope }: { scope: ChatScope }) {
    current = useChatSession(scope);
    return null;
  }

  beforeEach(async () => {
    await Storage.clear();
    jest.clearAllMocks();
    root = createRoot();
  });

  afterEach(async () => {
    await act(async () => { root.unmount(); });
  });

  it.each([
    ['mode', plain, wallet],
    ['account', wallet, { ...wallet, account: RECIPIENT }],
    ['network', wallet, { ...wallet, chainId: 'another-chain' }],
  ] as const)('isolates late responses and saved candidates after changing %s', async (_, source, target) => {
    const original = [{ prompt: 'Which GNS?', answer: 'GNS: gno.land/r/a/gns or gno.land/r/b/gns.' }];
    const destination = [{ prompt: 'My GNOT balance?', answer: '2 GNOT' }];
    const originalSnapshot = JSON.stringify({ version: 1, turns: original });
    const destinationSnapshot = JSON.stringify({ version: 1, turns: destination });
    await Storage.setItem(chatSessionKey(source), originalSnapshot);
    await Storage.setItem(chatSessionKey(target), destinationSnapshot);
    await act(async () => { root.render(<Probe scope={source} />); });
    expect(current.ready).toBe(true);
    expect(current.turns).toEqual(original);
    jest.clearAllMocks();
    const blocked = blockedAgent(current.history);
    let pending!: Promise<void>;
    await act(async () => {
      pending = consume(current.run(blocked.agent, { prompt: 'Pending question' }, { account: source.mode === 'onbloc' ? source.account : undefined }), true);
      await blocked.ready;
    });

    await act(async () => { root.render(<Probe scope={target} />); });

    expect(blocked.signal?.aborted).toBe(true);
    expect(current.turns).toEqual(destination);
    await act(async () => {
      blocked.release();
      await pending;
    });
    expect(current.turns).toEqual(destination);
    expect(Storage.setItem).toHaveBeenCalledWith(chatSessionKey(source), originalSnapshot);
    expect(Storage.setItem).not.toHaveBeenCalledWith(chatSessionKey(target), expect.anything());
    expect(await Storage.getItem(chatSessionKey(target))).toBe(destinationSnapshot);
    expect(await Storage.getItem(chatSessionKey(source))).toBe(originalSnapshot);
  });

  it('cancels a pending answer on background without saving it after foregrounding', async () => {
    await act(async () => { root.render(<Probe scope={wallet} />); });
    const change = jest.mocked(AppState.addEventListener).mock.calls.find(([type]) => type === 'change')![1];
    const blocked = blockedAgent(current.history);
    let pending!: Promise<void>;
    await act(async () => {
      pending = consume(current.run(blocked.agent, { prompt: 'Show my holdings' }), true);
      await blocked.ready;
    });
    await act(async () => {
      change('background');
      change('active');
      blocked.release();
      await pending;
    });
    expect(blocked.signal?.aborted).toBe(true);
    expect(current.turns).toEqual([]);
  });

  it('preserves the visible candidates but invalidates their authority after backgrounding', async () => {
    await act(async () => { root.render(<Probe scope={wallet} />); });
    const candidates = ['gno.land/r/a/gns', 'gno.land/r/b/gns'];
    const proposal = {
      operation: 'transfer', recipient: FRIEND.alias, amount: { kind: 'exact', value: '1' },
      asset: { kind: 'symbol', value: 'GNS' },
    };
    const replies = [
      intentReplyText({ kind: 'prepare' }), JSON.stringify(proposal),
      intentReplyText({ kind: 'prepare' }), JSON.stringify({ ...proposal, asset: { kind: 'id', value: candidates[1] } }),
    ];
    const llm: LLM = {
      contextTokens: 8192,
      async *generate() {
        const text = replies.shift();
        if (text === undefined) throw new Error('Unexpected model call.');
        yield { type: GenerateEventType.Text, delta: text };
        yield {
          type: GenerateEventType.Done, aborted: false, finishReason: 'stop', warnings: [],
          messages: [{ role: 'assistant', content: text }], metrics: { totalMs: 1, ttftMs: null },
        };
      },
    };
    const sdk = fakeWallet({
      contacts: [FRIEND],
      failWith: new WalletError(WalletErrorCode.AmbiguousToken, 'Choose a token.', candidates),
    });
    const handoff = jest.fn();
    const agent = new AIAgent({ llm, harness: new Harness(), wallet: sdk, onTransaction: handoff, session: current.history });
    const options = { account: ACCOUNT, allowTransactionPreparation: true };
    await act(async () => { await consume(current.run(agent, { prompt: 'Send 1 GNS to carol.' }, options)); });
    const visible = current.turns;
    expect(visible).toHaveLength(1);
    for (const candidate of candidates) expect(visible[0].answer).toContain(candidate);
    expect(sdk.calls).toHaveLength(1);

    const change = jest.mocked(AppState.addEventListener).mock.calls.find(([type]) => type === 'change')![1];
    await act(async () => {
      change('background');
      change('active');
    });
    expect(current.turns).toEqual(visible);
    await act(async () => { await consume(current.run(agent, { prompt: candidates[1] }, options)); });
    expect(sdk.calls).toHaveLength(1);
    expect(handoff).not.toHaveBeenCalled();
  });

  it('does not repopulate cleared memory or storage when an aborted run returns late', async () => {
    await Storage.setItem(chatSessionKey(other), JSON.stringify({
      version: 1, turns: [{ prompt: 'Old question', answer: 'Old answer' }],
    }));
    await act(async () => { root.render(<Probe scope={other} />); });
    expect(current.ready).toBe(true);
    jest.clearAllMocks();
    const blocked = blockedAgent(current.history);
    let pending!: Promise<void>;
    await act(async () => {
      pending = consume(current.run(blocked.agent, { prompt: 'Pending question' }, { account: RECIPIENT }), true);
      await blocked.ready;
    });

    await act(async () => { current.reset(); });

    expect(blocked.signal?.aborted).toBe(true);
    expect(current.turns).toEqual([]);
    expect(await Storage.getItem(chatSessionKey(other))).toBeNull();
    await act(async () => {
      blocked.release();
      await pending;
    });
    expect(current.turns).toEqual([]);
    expect(Storage.setItem).not.toHaveBeenCalled();
    expect(Storage.removeItem).toHaveBeenCalledWith(chatSessionKey(other));
    expect(await Storage.getItem(chatSessionKey(other))).toBeNull();
  });

  it('persists compacted history and restores it without the discarded turn', async () => {
    const contextTokens = 8192;
    const recent: ChatTurn = { prompt: 'The recipient is Carol.', answer: 'I will use Carol.' };
    await Storage.setItem(chatSessionKey(other), JSON.stringify({
      version: 1, turns: [{ prompt: 'Obsolete topic', answer: 'x'.repeat(contextTokens * 2) }, recent],
    }));
    await act(async () => { root.render(<Probe scope={other} />); });
    expect(current.turns).toHaveLength(2);
    const reply = (text: string) => ({
      content: [{ type: 'text' as const, text }],
      finishReason: { unified: 'stop' as const, raw: 'stop' }, warnings: [],
      usage: {
        inputTokens: { total: 5, noCache: 5, cacheRead: undefined, cacheWrite: undefined },
        outputTokens: { total: 5, text: 5, reasoning: undefined },
      },
    });
    // Classification first, then the answer.
    const model = new MockLanguageModelV4({
      doGenerate: [reply(intentReplyText({ kind: 'explanation' })), reply('Carol is the recipient.')],
    });
    const llm = new LLMFromModel(wrapLanguageModel({ model, middleware: simulateStreamingMiddleware() }));
    const agent = newAgent(llm, current.history);
    const prompt = 'Which recipient did I just name?';

    await act(async () => {
      await consume(current.run(agent, { prompt, maxOutputTokens: 128 }, { contextTokens, account: RECIPIENT }));
    });

    const expected = [recent, { prompt, answer: 'Carol is the recipient.' }];
    expect(current.turns).toEqual(expected);
    for (const call of model.doGenerateCalls) {
      const modelPrompt = JSON.stringify(call.prompt);
      expect(modelPrompt).not.toContain('Obsolete topic');
      expect(modelPrompt).toContain(recent.prompt);
      expect(modelPrompt).toContain(prompt);
    }
    expect(JSON.parse((await Storage.getItem(chatSessionKey(other)))!)).toEqual({ version: 1, turns: expected });

    await act(async () => { root.unmount(); });
    root = createRoot();
    await act(async () => { root.render(<Probe scope={other} />); });
    expect(current.ready).toBe(true);
    expect(current.turns).toEqual(expected);
    expect(model.doGenerateCalls).toHaveLength(2);
  });

  it('rejects an agent built with another conversation\'s session', async () => {
    await act(async () => { root.render(<Probe scope={other} />); });
    expect(current.ready).toBe(true);
    const llm: LLM = { contextTokens: 8192, async *generate() { throw new Error('unreachable'); } };
    const agent = newAgent(llm, createChatSession());

    await expect(consume(current.run(agent, { prompt: 'Hello' }, { account: RECIPIENT }))).rejects.toThrow(
      'The agent continues another conversation.',
    );
  });
});
