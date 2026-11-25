import { act } from 'react';
import { AppState } from 'react-native';
import Storage from 'expo-sqlite/kv-store';
import { createRoot, type Root } from 'test-renderer';
import { simulateStreamingMiddleware, wrapLanguageModel } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';

import { AIAgent } from '../../../agent';
import { Harness } from '../../../harness/core';
import {
  chatSessionKey,
  GenerateEventType,
  LLMFromModel,
  type ChatScope,
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
  mode: 'onbloc', endpoint: 'https://example.test/mcp', chainId: 'test-chain', account: 'test-account',
};

async function consume(events: AsyncIterable<GenerateEvent>) {
  for await (const event of events) {
    if (event.type === GenerateEventType.Done) expect(event.aborted).toBe(false);
  }
}

function blockedAgent() {
  let signal: AbortSignal | undefined;
  const { promise: ready, resolve: started } = Promise.withResolvers<void>();
  const { promise: blocked, resolve: release } = Promise.withResolvers<void>();
  const llm: LLM = {
    contextTokens: 8192,
    async *generate(_settings, options) {
      signal = options?.signal;
      started();
      await blocked;
      // Deliberately deliver a late result even after cancellation.
      yield { type: GenerateEventType.Text, delta: 'Late answer' };
      yield {
        type: GenerateEventType.Done, aborted: false, finishReason: 'stop', warnings: [],
        messages: [{ role: 'assistant', content: 'Late answer' }], metrics: { totalMs: 1, ttftMs: null },
      };
    },
  };
  return { agent: new AIAgent({ llm, harness: new Harness() }), ready, release, get signal() { return signal; } };
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
    ['account', wallet, { ...wallet, account: 'another-account' }],
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
    const blocked = blockedAgent();
    let pending!: Promise<void>;
    await act(async () => {
      pending = consume(current.run(blocked.agent, { prompt: 'Pending question' }));
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
    const blocked = blockedAgent();
    const pending = consume(current.run(blocked.agent, { prompt: 'Show my holdings' }));
    await blocked.ready;
    await act(async () => {
      change('background');
      change('active');
      blocked.release();
      await pending;
    });
    expect(blocked.signal?.aborted).toBe(true);
    expect(current.turns).toEqual([]);
  });

  it('does not repopulate cleared memory or storage when an aborted run returns late', async () => {
    await Storage.setItem(chatSessionKey(plain), JSON.stringify({
      version: 1, turns: [{ prompt: 'Old question', answer: 'Old answer' }],
    }));
    await act(async () => { root.render(<Probe scope={plain} />); });
    expect(current.ready).toBe(true);
    jest.clearAllMocks();
    const blocked = blockedAgent();
    let pending!: Promise<void>;
    await act(async () => {
      pending = consume(current.run(blocked.agent, { prompt: 'Pending question' }));
      await blocked.ready;
    });

    await act(async () => { current.reset(); });

    expect(blocked.signal?.aborted).toBe(true);
    expect(current.turns).toEqual([]);
    expect(await Storage.getItem(chatSessionKey(plain))).toBeNull();
    await act(async () => {
      blocked.release();
      await pending;
    });
    expect(current.turns).toEqual([]);
    expect(Storage.setItem).not.toHaveBeenCalled();
    expect(Storage.removeItem).toHaveBeenCalledWith(chatSessionKey(plain));
    expect(await Storage.getItem(chatSessionKey(plain))).toBeNull();
  });

  it('persists compacted history and restores it without the discarded turn', async () => {
    const recent: ChatTurn = { prompt: 'The recipient is Carol.', answer: 'I will use Carol.' };
    await Storage.setItem(chatSessionKey(plain), JSON.stringify({
      version: 1, turns: [{ prompt: 'Obsolete topic', answer: 'x'.repeat(6000) }, recent],
    }));
    await act(async () => { root.render(<Probe scope={plain} />); });
    expect(current.turns).toHaveLength(2);
    const model = new MockLanguageModelV4({
      doGenerate: {
        content: [{ type: 'text', text: 'Carol is the recipient.' }],
        finishReason: { unified: 'stop', raw: 'stop' }, warnings: [],
        usage: {
          inputTokens: { total: 5, noCache: 5, cacheRead: undefined, cacheWrite: undefined },
          outputTokens: { total: 5, text: 5, reasoning: undefined },
        },
      },
    });
    const llm = new LLMFromModel(wrapLanguageModel({ model, middleware: simulateStreamingMiddleware() }));
    const agent = new AIAgent({ llm, harness: new Harness() });
    const prompt = 'Which recipient did I just name?';

    await act(async () => {
      await consume(current.run(agent, { prompt, maxOutputTokens: 128 }, { contextTokens: 2048 }));
    });

    const expected = [recent, { prompt, answer: 'Carol is the recipient.' }];
    expect(current.turns).toEqual(expected);
    const modelPrompt = JSON.stringify(model.doGenerateCalls[0].prompt);
    expect(modelPrompt).not.toContain('Obsolete topic');
    expect(modelPrompt).toContain(recent.prompt);
    expect(modelPrompt).toContain(prompt);
    expect(JSON.parse((await Storage.getItem(chatSessionKey(plain)))!)).toEqual({ version: 1, turns: expected });

    await act(async () => { root.unmount(); });
    root = createRoot();
    await act(async () => { root.render(<Probe scope={plain} />); });
    expect(current.ready).toBe(true);
    expect(current.turns).toEqual(expected);
    expect(model.doGenerateCalls).toHaveLength(1);
  });
});
