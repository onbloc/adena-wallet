import type { ModelMessage } from 'ai';

import { canRememberTurn, chatSessionKey, compactContext, createChatSession } from '../session';

describe('chat sessions', () => {
  it('restores text turns in their own endpoint, chain and account scope', () => {
    const scope = { mode: 'onbloc', endpoint: 'https://one.test/mcp', chainId: 'gnoland-1', account: 'g1alice' } as const;
    const saved = new Map<string, string>();
    const chat = createChatSession();
    expect(chat.complete('Which token?', 'I meant xGNS.')).toBe(true);
    saved.set(chatSessionKey(scope), chat.serialize());

    expect(createChatSession(saved.get(chatSessionKey(scope))).messages('How many?')).toEqual([
      { role: 'user', content: 'Which token?' },
      { role: 'assistant', content: 'I meant xGNS.' },
      { role: 'user', content: 'How many?' },
    ]);
    for (const other of [
      { ...scope, account: 'g1bob' },
      { ...scope, endpoint: 'https://two.test/mcp' },
      { ...scope, chainId: 'testnet' },
      { mode: 'plain' as const },
    ]) expect(createChatSession(saved.get(chatSessionKey(other))).turns).toEqual([]);
  });

  it('never remembers cancelled, incomplete, or untrusted turns', () => {
    const messages: ModelMessage[] = [{ role: 'assistant', content: 'answer' }];
    expect(canRememberTurn({ aborted: false, finishReason: 'stop', messages })).toBe(true);
    expect(canRememberTurn({ aborted: true, finishReason: 'stop', messages })).toBe(false);
    expect(canRememberTurn({ aborted: false, finishReason: 'length', messages })).toBe(false);
    expect(canRememberTurn({ aborted: false, finishReason: 'stop', messages: [] })).toBe(false);
    const chat = createChatSession();
    expect(chat.complete(' ', 'answer')).toBe(false);
    expect(chat.complete('question', ' ')).toBe(false);
    expect(chat.complete('question', 'x'.repeat(32_769))).toBe(false);
    expect(chat.turns).toEqual([]);
  });
  it('retains exact boundary-sized turns and refuses oversized prompts or records atomically', () => {
    const chat = createChatSession();
    const prompt = 'p'.repeat(16_384);
    const answer = 'a'.repeat(32_768);
    const record = 'r'.repeat(2_048);
    expect(chat.complete(prompt, answer, record)).toBe(true);
    expect(chat.complete(`${prompt}p`, 'answer')).toBe(false);
    expect(chat.complete('question', 'answer', `${record}r`)).toBe(false);
    expect(chat.turns).toEqual([{ prompt, answer, record }]);
    expect(createChatSession(chat.serialize()).turns).toEqual(chat.turns);
  });

  it('bounds saved turns and rejects corrupt or unsupported snapshots', () => {
    const chat = createChatSession();
    for (let i = 0; i < 52; i++) chat.complete(`q${i}`, `a${i}`);
    const restored = createChatSession(chat.serialize());
    expect(restored.turns).toHaveLength(50);
    expect(restored.turns[0]).toEqual({ prompt: 'q2', answer: 'a2' });
    expect(createChatSession('{bad').turns).toEqual([]);
    expect(createChatSession('{"version":2,"turns":[]}').turns).toEqual([]);
    expect(createChatSession('{"version":1,"turns":[{"prompt":"q","answer":"a","toolCalls":[]}]}').turns).toEqual([]);
    restored.reset();
    expect(restored.messages('new')).toEqual([{ role: 'user', content: 'new' }]);
  });

  it('trims only the oldest completed turns and preserves version-one snapshots', () => {
    const chat = createChatSession('{"version":1,"turns":[{"prompt":"old","answer":"old answer"},{"prompt":"recent","answer":"recent answer"}]}');
    const original = chat.turns;
    chat.trimOldest(0);
    expect(chat.turns).toBe(original);
    chat.trimOldest(1);
    expect(chat.messages('current')).toEqual([
      { role: 'user', content: 'recent' },
      { role: 'assistant', content: 'recent answer' },
      { role: 'user', content: 'current' },
    ]);
    expect(JSON.parse(chat.serialize())).toEqual({
      version: 1, turns: [{ prompt: 'recent', answer: 'recent answer' }],
    });
    expect(createChatSession(chat.serialize()).turns).toEqual(chat.turns);
    expect(original).toHaveLength(2);
    chat.trimOldest(Number.MAX_SAFE_INTEGER);
    expect(chat.turns).toEqual([]);
    expect(chat.complete('next', 'next answer')).toBe(true);
    expect(chat.turns).toEqual([{ prompt: 'next', answer: 'next answer' }]);
  });

  it.each([-1, 0.5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid trim counts without changing history: %s',
    count => {
      const chat = createChatSession();
      chat.complete('question', 'answer');
      expect(() => chat.trimOldest(count)).toThrow(RangeError);
      expect(chat.turns).toEqual([{ prompt: 'question', answer: 'answer' }]);
    }
  );
});

describe('context compaction', () => {
  const live = [
    { role: 'user', content: 'current request' },
    { role: 'assistant', content: [{ type: 'tool-call', toolCallId: 'c1', toolName: 'lookup', input: {} }] },
    { role: 'tool', content: [{ type: 'tool-result', toolCallId: 'c1', toolName: 'lookup', output: { type: 'text', value: 'result' } }] },
  ] as ModelMessage[];
  const history: ModelMessage[] = [
    { role: 'user', content: 'old' }, { role: 'assistant', content: 'old answer' },
    { role: 'user', content: 'recent' }, { role: 'assistant', content: 'recent answer' },
  ];

  it('drops the fewest complete turns and preserves the live tool exchange', () => {
    const messages = [...history, ...live];
    expect(compactContext(messages, candidate => candidate.length <= 5)).toEqual([...history.slice(2), ...live]);
    expect(messages).toHaveLength(7);
    expect(compactContext(messages, () => true)).toBe(messages);
  });

  it('fails closed if the current request alone is too large or prior messages contain tools', () => {
    expect(compactContext([...history, ...live], candidate => candidate.length <= 2)).toBeUndefined();
    const historyWithTool = [...live, { role: 'user', content: 'next' }] as ModelMessage[];
    expect(compactContext(historyWithTool, candidate => candidate.length <= 1)).toBeUndefined();
  });
});
