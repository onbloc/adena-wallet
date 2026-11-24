import { createChatSession } from '../../../llm/core';
import { createPreparationHistory, preparationHistoryKey } from '../preparationHistory';

const scope = { mode: 'onbloc', endpoint: 'https://one.test/mcp', chainId: 'gnoland-1', account: 'g1alice' } as const;

describe('preparation recovery', () => {
  it('restores only the status and kind in the same account, endpoint and chain', () => {
    const storage = new Map<string, string>();
    const prepared = {
      summary: { type: 'transfer' as const, from: 'g1alice', to: 'g1bob', amount: '12', token: 'GNOT' },
      tx: { args: ['executable-argument'], signature: 'secret-signature' },
    };
    const history = createPreparationHistory();
    history.record(prepared.summary.type);
    storage.set(preparationHistoryKey(scope), history.serialize());

    const saved = storage.get(preparationHistoryKey(scope));
    expect(saved).toBe('{"version":1,"prepared":["transfer"]}');
    expect(saved).not.toContain('g1bob');
    expect(saved).not.toContain('executable-argument');
    expect(saved).not.toContain('secret-signature');
    expect(createPreparationHistory(saved).prepared).toEqual(['transfer']);
    for (const other of [
      { ...scope, account: 'g1bob' },
      { ...scope, endpoint: 'https://two.test/mcp' },
      { ...scope, chainId: 'testnet' },
    ]) expect(createPreparationHistory(storage.get(preparationHistoryKey(other))).prepared).toEqual([]);
  });

  it('keeps recovery separate from chat even when a turn was not remembered', () => {
    const chat = createChatSession();
    const history = createPreparationHistory();
    history.record('allowance');
    const restored = createPreparationHistory(history.serialize());

    expect(restored.prepared).toEqual(['allowance']);
    expect(chat.messages('next')).toEqual([{ role: 'user', content: 'next' }]);
  });

  it('rejects malformed or executable recovery records and bounds history', () => {
    expect(createPreparationHistory('{bad').prepared).toEqual([]);
    expect(createPreparationHistory('{"version":2,"prepared":[]}').prepared).toEqual([]);
    expect(createPreparationHistory('{"version":1,"prepared":[{"type":"transfer","args":["secret"]}]}').prepared).toEqual([]);
    const history = createPreparationHistory();
    for (let i = 0; i < 51; i++) history.record('transfer');
    expect(createPreparationHistory(history.serialize()).prepared).toHaveLength(50);
  });
});
