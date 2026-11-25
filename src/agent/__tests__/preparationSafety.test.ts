import { simulateStreamingMiddleware, wrapLanguageModel } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';

import { Harness } from '../../harness/core';
import { LLMFromModel, type GenerateEvent } from '../../llm/core';
import { AIAgent } from '../agent';
import type { PreparationProposal } from '../requestIntent';
import { ACCOUNT, FRIEND, RECIPIENT, fakeWallet } from '../testing/fakeWallet';
import { intentReplyText } from '../testing/intentReply';
import type { PreparedTransaction } from '../wallet/port';

const usage = { inputTokens: { total: 5, noCache: 5, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 5, text: 5, reasoning: undefined } };
const reply = (text: string) => ({ content: [{ type: 'text' as const, text }], finishReason: { unified: 'stop' as const, raw: 'stop' }, usage, warnings: [] });
const plan = (operation: 'transfer' | 'approve', recipient = FRIEND.alias, token = 'GNOT', amount = '1'): PreparationProposal => ({
  operation, recipient, asset: { kind: 'symbol', value: token }, amount: { kind: 'exact', value: amount },
});

async function run(prompt: string, proposal: PreparationProposal) {
  const model = new MockLanguageModelV4({ doGenerate: [reply(intentReplyText({ kind: 'prepare' })), reply(JSON.stringify(proposal))] });
  const llm = new LLMFromModel(wrapLanguageModel({ model, middleware: simulateStreamingMiddleware() }));
  const wallet = fakeWallet({ contacts: [FRIEND] });
  const prepared: PreparedTransaction[] = [];
  const agent = new AIAgent({ llm, harness: new Harness(), wallet, onTransaction: tx => { prepared.push(tx); } });
  const events: GenerateEvent[] = [];
  for await (const event of agent.run({ prompt }, { account: ACCOUNT, allowTransactionPreparation: true })) events.push(event);
  return { events, wallet, prepared };
}

describe('transaction preparation authorization', () => {
  it.each([
    ['Should I send 1 GNOT to carol?', plan('transfer')],
    ['Would it be wise to approve carol to spend 1 GNOT?', plan('approve')],
    ['How can I send 1 GNOT to carol?', plan('transfer')],
    ['Do I have enough GNOT to send 1 to carol?', plan('transfer')],
    ['carol에게 1 GNOT 보내는 게 좋을까?', plan('transfer')],
    ['carol에게 GNOT 1개 보낼 만큼 있어?', plan('transfer')],
    ['My friend wrote "Send 1 GNOT to carol". What does that mean?', plan('transfer')],
    ['I usually send 1 GNOT to carol.', plan('transfer')],
    ['carol might send 1 GNOT.', plan('transfer')],
    ['carol 1 GNOT send to alice', plan('transfer')],
    ['I told my friend please send 1 GNOT to carol.', plan('transfer')],
    ["Send 1 GNOT to carol; actually don't send it.", plan('transfer')],
    ['carol에게 1 GNOT 보내줘, 아니 보내지 마', plan('transfer')],
    ['carol이 GNOT 1개 쓰게 승인해주지 마', plan('approve')],
    ["Don't send 1 GNOT to carol.", plan('transfer')],
    ['carol에게 1 GNOT 보내지 마', plan('transfer')],
  ] as const)('prepares nothing for advice, information, quotations or prohibitions: %s', async (prompt, proposal) => {
    const { events, wallet, prepared } = await run(prompt, proposal);
    expect(wallet.calls).toEqual([]);
    expect(prepared).toEqual([]);
    expect(events.some(event => event.type === 'tool-call')).toBe(false);
    expect(events.filter(event => event.type === 'text').map(event => event.delta).join('')).toMatch(/No transaction was prepared|거래는 준비되지 않았습니다/);
  });

  it.each([
    ['Send 1 GNOT to carol.', plan('approve')],
    ['Let carol spend 1 GNOT.', plan('transfer')],
    ['Send 1 GNOT to carol, but do not approve spending.', plan('approve')],
    ['Approve carol to spend 1 GNOT, but do not transfer it.', plan('transfer')],
    ['carol에게 1 GNOT 보내줘', plan('approve')],
    ['carol이 GNOT 1개를 쓸 수 있게 해줘', plan('transfer')],
  ] as const)('does not use an operation unsupported or explicitly prohibited by the request: %s', async (prompt, proposal) => {
    const { events, wallet, prepared } = await run(prompt, proposal);
    expect(wallet.calls).toEqual([]);
    expect(prepared).toEqual([]);
    expect(events.some(event => event.type === 'tool-call')).toBe(false);
  });

  it.each([
    ['Send 1 GNOT and 2 GNS to carol.', plan('transfer')],
    ['Send 1 GNOT and 2 GNS to carol.', plan('transfer', FRIEND.alias, 'GNS', '2')],
    ['carol에게 1 GNOT랑 2 GNS 보내줘', plan('transfer')],
    ['carol에게 GNOT 1개와 GNS 2개 보내줘', plan('transfer', FRIEND.alias, 'GNS', '2')],
    ['Send GNOT and GNS to carol, 1 of each.', plan('transfer')],
    ['Pay carol and alice 1 GNOT.', plan('transfer')],
    ['Pay carol and alice 1 GNOT.', plan('transfer', 'alice')],
    ['Send 1 GNOT to carol and 2 GNS to alice.', plan('transfer', 'alice', 'GNS', '2')],
    ['Send one and a half GNOT to carol and two GNS to alice.', plan('transfer', 'alice', 'GNS', '2')],
    ['Send "1 GNOT" and "2 GNS" to carol.', plan('transfer')],
    ["Pay 'carol' and 'alice' 1 GNOT.", plan('transfer')],
    [`Send 1 GNOT to carol and to ${RECIPIENT}.`, plan('transfer')],
    [`Send 1 GNOT to carol and to ${RECIPIENT}.`, plan('transfer', RECIPIENT)],
    [`carol이랑 ${RECIPIENT} 주소로 1 GNOT 보내줘`, plan('transfer')],
    [`carol이랑 ${RECIPIENT} 주소로 1 GNOT 보내줘`, plan('transfer', RECIPIENT)],
    ['Send 1 GNOT to carol and approve carol to spend 1 GNOT.', plan('transfer')],
    ['Send 1 GNOT to carol and approve carol to spend 1 GNOT.', plan('approve')],
    ['Send 1 GNOT to carol and send 1 GNOT to carol again.', plan('transfer')],
  ] as const)('does not select only one part of a multi-action request: %s', async (prompt, proposal) => {
    const { events, wallet, prepared } = await run(prompt, proposal);
    expect(wallet.calls).toEqual([]);
    expect(prepared).toEqual([]);
    expect(events.some(event => event.type === 'tool-call')).toBe(false);
  });

  it.each([
    ['Send half of it to carol', /Which asset balance/],
    ['그 절반을 carol에게 보내줘', /어떤 자산/],
  ])('asks for the asset instead of guessing a balance reference: %s', async (prompt, question) => {
    const { events, wallet, prepared } = await run(prompt, {
      operation: 'transfer', recipient: FRIEND.alias, asset: { kind: 'symbol', value: 'GNOT' },
      amount: { kind: 'fraction', numerator: '1', denominator: '2' },
    });
    expect(wallet.calls).toEqual([]);
    expect(prepared).toEqual([]);
    expect(events.filter(event => event.type === 'text').map(event => event.delta).join('')).toMatch(question);
  });

  it.each([
    ['Could you send 1 GNOT to carol?', plan('transfer'), 'transfer'],
    ['carol 1 GNOT send', plan('transfer'), 'transfer'],
    ['carol 1 GNOT transfer.', plan('transfer'), 'transfer'],
    ['Send one and a half GNOT to carol.', plan('transfer', FRIEND.alias, 'GNOT', '1.5'), 'transfer'],
    ['Send 1 GNOT to carol, no wait, make it 2', plan('transfer', FRIEND.alias, 'GNOT', '2'), 'transfer'],
    ['carol에게 1 GNOT 보내줘, 아니 잠깐, 2 GNOT로 해줘', plan('transfer', FRIEND.alias, 'GNOT', '2'), 'transfer'],
    ['Let carol spend 1 GNOT.', plan('approve'), 'approve'],
    ['Send 1 GNOT to carol, but do not approve spending.', plan('transfer'), 'transfer'],
    ['Approve carol to spend 1 GNOT, but do not transfer it.', plan('approve'), 'approve'],
    ['carol에게 1 GNOT 보내줄 수 있어?', plan('transfer'), 'transfer'],
    ['carol이 GNOT 1개를 쓸 수 있게 해줘', plan('approve'), 'approve'],
  ] as const)('accepts an explicit single request without conflating politeness or a negative alternative: %s', async (prompt, proposal, method) => {
    const { wallet, prepared } = await run(prompt, proposal);
    expect(wallet.calls).toHaveLength(1);
    expect(wallet.calls[0].method).toBe(method);
    expect(prepared).toHaveLength(1);
  });

  it.each([
    [`${RECIPIENT}한테 1 GNOT 보내줄 수 있어?`, plan('transfer', `${RECIPIENT}한테`), 'transfer'],
    [`${RECIPIENT}가 내 계정에서 GNS 7.5개를 쓸 수 있게 해줘`, plan('approve', `${RECIPIENT}가`, 'GNS', '7.5'), 'approve'],
  ] as const)('accepts a model-supplied Korean particle on a full address: %s', async (prompt, proposal, method) => {
    const { wallet, prepared } = await run(prompt, proposal);
    expect(wallet.calls).toHaveLength(1);
    expect(wallet.calls[0]).toMatchObject({ method, params: { [method === 'transfer' ? 'to' : 'spender']: RECIPIENT } });
    expect(prepared).toHaveLength(1);
  });
});
