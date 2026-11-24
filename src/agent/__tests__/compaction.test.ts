import { simulateStreamingMiddleware, wrapLanguageModel } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';

import { Harness } from '../../harness/core';
import { createOnblocToolSource } from '../../harness/mcp';
import { fakeOnblocMcp } from '../../harness/mcp/testing/fakeOnblocMcp';
import { createChatSession, LLMFromModel } from '../../llm/core';
import { AIAgent } from '../agent';
import { ACCOUNT, fakeWallet } from '../testing/fakeWallet';

const usage = {
  inputTokens: { total: 5, noCache: 5, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 5, text: 5, reasoning: undefined },
};

describe('agent context compaction', () => {
  it('keeps the current read and result without replaying an earlier prepared transaction', async () => {
    const mcp = fakeOnblocMcp([
      { name: 'get_native_balance', output: { address: ACCOUNT, denom: 'ugnot', balance: '42000000' } },
    ]);
    const wallet = fakeWallet();
    const onTransaction = jest.fn();
    const model = new MockLanguageModelV4({
      doGenerate: [
        { content: [{ type: 'tool-call', toolCallId: 'live-read', toolName: 'get_balance',
          input: JSON.stringify({ kind: 'one', asset: { kind: 'symbol', value: 'GNOT' } }) }],
          finishReason: { unified: 'tool-calls', raw: 'tool-calls' }, usage, warnings: [] },
        { content: [{ type: 'text', text: '42 GNOT' }],
          finishReason: { unified: 'stop', raw: 'stop' }, usage, warnings: [] },
      ],
    });
    const llm = new LLMFromModel(wrapLanguageModel({ model, middleware: simulateStreamingMiddleware() }), { contextTokens: 8192 });
    const harness = new Harness({
      toolSources: [createOnblocToolSource({ endpoint: 'https://example.test/mcp', fetcher: mcp.fetcher })],
    });
    const agent = new AIAgent({ llm, harness, wallet, onTransaction });
    const session = createChatSession();
    session.complete('old request', 'x'.repeat(20_000));
    session.complete('send one to alice', 'An unsigned transaction was prepared.');
    const restored = createChatSession(session.serialize());
    let finished = false;
    for await (const event of agent.run({
      messages: restored.messages('What is my balance now?'),
      maxOutputTokens: 128,
    }, { account: ACCOUNT })) {
      if (event.type === 'done') finished = true;
    }
    expect(finished).toBe(true);

    expect(model.doGenerateCalls).toHaveLength(2);
    for (const call of model.doGenerateCalls) {
      const prompt = JSON.stringify(call.prompt);
      expect(prompt).not.toContain('old request');
      expect(prompt).toContain('send one to alice');
      expect(prompt).toContain('What is my balance now?');
    }
    const continuation = JSON.stringify(model.doGenerateCalls[1].prompt);
    expect(continuation).toContain('live-read');
    expect(continuation).toContain('42000000');
    expect(mcp.calls).toHaveLength(1);
    expect(wallet.calls).toEqual([]);
    expect(onTransaction).not.toHaveBeenCalled();
  });
});
