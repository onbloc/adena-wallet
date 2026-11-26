import { simulateStreamingMiddleware, wrapLanguageModel } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';
import { Harness } from '../../harness/core';
import { createOnblocToolSource } from '../../harness/mcp';
import { fakeOnblocMcp } from '../../harness/mcp/testing/fakeOnblocMcp';
import { createChatSession, LLMFromModel } from '../../llm/core';
import { AIAgent } from '../agent';
import { ACCOUNT, fakeWallet } from '../testing/fakeWallet';
import { intentReplyText } from '../testing/intentReply';

const usage = { inputTokens: { total: 5, noCache: 5, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 5, text: 5, reasoning: undefined } };

describe('agent context compaction', () => {
  it('prunes old history before classification without replaying a past action or using an old balance', async () => {
    const mcp = fakeOnblocMcp([{ name: 'get_native_balance', output: { address: ACCOUNT, denom: 'ugnot', balance: '42000000' } }]);
    const wallet = fakeWallet();
    const onTransaction = jest.fn();
    const model = new MockLanguageModelV4({ doGenerate: [{
      content: [{ type: 'text', text: intentReplyText({ kind: 'lookup', requests: [{ target: 'balance', request: { kind: 'one', asset: { kind: 'symbol', value: 'GNOT' } } }] }) }],
      finishReason: { unified: 'stop', raw: 'stop' }, usage, warnings: [],
    }] });
    const session = createChatSession();
    session.complete('old request', 'x'.repeat(20000));
    session.complete('send one to alice', 'An unsigned transaction was prepared. Previous balance: 999 GNOT.');
    const agent = new AIAgent({
      llm: new LLMFromModel(wrapLanguageModel({ model, middleware: simulateStreamingMiddleware() })),
      harness: new Harness({ toolSources: [createOnblocToolSource({ endpoint: 'https://example.test/mcp', fetcher: mcp.fetcher })] }), wallet, onTransaction,
      session: createChatSession(session.serialize()),
    });
    let text = '';
    for await (const event of agent.run({ prompt: 'What is my GNOT balance now?', maxOutputTokens: 128 }, { account: ACCOUNT })) if (event.type === 'text') text += event.delta;
    const prompt = JSON.stringify(model.doGenerateCalls[0].prompt);
    expect(prompt).not.toContain('old request');
    expect(prompt).toContain('send one to alice');
    expect(prompt).toContain('What is my GNOT balance now?');
    expect(text).toContain('42 GNOT');
    expect(text).toContain(ACCOUNT);
    expect(mcp.calls).toEqual([{ name: 'get_native_balance', arguments: { address: ACCOUNT } }]);
    expect(wallet.calls).toEqual([]);
    expect(onTransaction).not.toHaveBeenCalled();
    expect(agent.serialize()).not.toContain('old request');
  });
});
