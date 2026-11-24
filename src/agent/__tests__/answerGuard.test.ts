import { canRememberTurn, GenerateEventType, type GenerateEvent } from '../../llm/core';
import { guardAnswer } from '../answerGuard';
import type { BalanceAsset, BalanceResult } from '../balanceOperation';

const isRead = (name: string) => name !== 'transfer' && name !== 'approve';

const metrics = { totalMs: 1 } as Extract<GenerateEvent, { type: 'done' }>['metrics'];
const done = (overrides: Partial<Extract<GenerateEvent, { type: 'done' }>> = {}): GenerateEvent => ({
  type: GenerateEventType.Done,
  metrics,
  aborted: false,
  warnings: [],
  messages: [{ role: 'assistant', content: 'kept' }],
  ...overrides,
});
const text = (delta: string): GenerateEvent => ({ type: GenerateEventType.Text, delta });
const toolCall = (name: string, invalid = false, input: unknown = {}): GenerateEvent => ({
  type: GenerateEventType.ToolCall,
  id: name,
  name,
  input,
  invalid,
});
const toolResult = (name: string, output: unknown): GenerateEvent => ({
  type: GenerateEventType.ToolResult,
  id: name,
  name,
  output,
});
const readOk = toolResult('read', { kind: 'result', value: 1 });
const prepared = toolResult('transfer', { kind: 'result', value: { status: 'prepared' } });
const native: BalanceAsset = {
  kind: 'native', assetId: 'ugnot', symbol: 'GNOT', amount: '44289888655', decimals: 6,
};
const token: BalanceAsset = {
  kind: 'token', assetId: 'gno.land/r/xgns', symbol: 'xGNS', amount: '17528000000', decimals: 6,
};
const balance = (overrides: Partial<BalanceResult> = {}): GenerateEvent => toolResult('get_balance', {
  kind: 'result',
  value: {
    account: 'account', chainId: 'chain', request: { kind: 'all' },
    status: 'complete', assets: [native, token], missing: [],
    ...overrides,
  },
});

async function guardFor(userText: string, ...events: GenerateEvent[]) {
  const out: GenerateEvent[] = [];
  for await (const event of guardAnswer(
    (async function* () {
      yield* events;
    })(),
    isRead,
    'get_balance',
    userText
  )) {
    out.push(event);
  }
  const answer = out.filter((event) => event.type === GenerateEventType.Text).map((event) => event.delta);
  return { out, answer, last: out[out.length - 1] as Extract<GenerateEvent, { type: 'done' }> };
}

const guard = (...events: GenerateEvent[]) => guardFor('', ...events);

describe('guardAnswer', () => {
  it('shows the model text and remembers the turn when a read succeeded', async () => {
    const { answer, last } = await guard(toolCall('read'), readOk, text('You have 5 GNOT'), done());

    expect(answer).toEqual(['You have 5 GNOT']);
    expect(last.messages).toHaveLength(1);
  });

  it('keeps a tool-free explanation in the conversation without marking it as verified wallet data', async () => {
    const { answer, last } = await guard(text('GNOT is the native token; ugnot is its base unit.'), done({ finishReason: 'stop' }));

    expect(answer).toEqual(['GNOT is the native token; ugnot is its base unit.']);
    expect(last.verifiedAnswer).toBeUndefined();
    expect(last.warnings).toContain('No wallet lookup was performed; this is an unverified model explanation.');
    expect(canRememberTurn(last)).toBe(true);
  });

  it('reports a failed lookup even when no lookup succeeded, and does not remember it', async () => {
    const { answer, last } = await guard(
      toolCall('read'), toolResult('read', { kind: 'denied', code: 'MCP_UNAVAILABLE' }),
      text('Your balance is zero.'), done({ finishReason: 'stop' })
    );

    expect(answer).toEqual(['Some lookups could not be verified. Review the individual tool results.']);
    expect(canRememberTurn(last)).toBe(false);
  });

  it('does not treat an unfinished tool call as a tool-free explanation', async () => {
    const { answer, last } = await guard(toolCall('read'), text('Everything is fine.'), done({ finishReason: 'stop' }));

    expect(answer).not.toContain('Everything is fine.');
    expect(canRememberTurn(last)).toBe(false);
  });

  it('formats normalized balances even when another successful read would otherwise allow the model summary through', async () => {
    const { answer, last } = await guard(
      balance(),
      toolResult('get_nfts_balance', { kind: 'result', value: { untrustedData: { items: [] } } }),
      text('Networking token: 44289888655. xGNS: 17528000000.'), done({ finishReason: 'stop' })
    );

    expect(answer).toEqual(['44289.888655 GNOT\n\nToken balances:\n- 17528 xGNS (gno.land/r/xgns)']);
    expect(last.verifiedAnswer).toBe(true);
    expect(canRememberTurn(last)).toBe(true);
  });

  it('shows the verified part of a mixed lookup but does not save a partially failed turn', async () => {
    const { answer, last } = await guard(
      balance({ assets: [{ ...native, amount: '1000000' }], status: 'partial', missing: ['tokens'] }),
      toolResult('get_nfts_balance', { kind: 'denied', code: 'MCP_UNAVAILABLE' }),
      text('Everything succeeded.'), done({ finishReason: 'stop' })
    );

    expect(answer).toEqual(['1 GNOT\n\nCould not verify: token balances.\n\nSome lookups could not be verified. Review the individual tool results.']);
    expect(last.verifiedAnswer).toBeUndefined();
    expect(canRememberTurn(last)).toBe(false);
  });

  it('does not remember a balance turn while another lookup remains unfinished', async () => {
    const { last } = await guard(
      balance({ assets: [{ ...native, amount: '1000000' }] }),
      toolCall('get_nfts_balance'), text('Everything succeeded.'), done({ finishReason: 'stop' })
    );

    expect(last.verifiedAnswer).toBeUndefined();
    expect(canRememberTurn(last)).toBe(false);
  });

  it('renders each distinct normalized balance request, including exact units and identities', async () => {
    const nativeRequest = { kind: 'one' as const, asset: { kind: 'symbol' as const, value: 'GNOT' } };
    const tokenRequest = { kind: 'one' as const, asset: { kind: 'symbol' as const, value: 'xGNS' } };
    const { answer, last } = await guard(
      balance({ request: nativeRequest, assets: [native] }),
      balance({ request: tokenRequest, assets: [token] }),
      text('An incorrect summary.'), done({ finishReason: 'length' })
    );

    expect(answer).toEqual(['44289.888655 GNOT\n\n17528 xGNS (gno.land/r/xgns)']);
    expect(last.verifiedAnswer).toBe(true);
    expect(canRememberTurn(last)).toBe(true);
  });

  it('does not trust ambiguous or unavailable normalized balances', async () => {
    const request = { kind: 'one' as const, asset: { kind: 'symbol' as const, value: 'xGNS' } };
    const { answer, last } = await guard(
      balance({ request, status: 'ambiguous', assets: [token, { ...token, assetId: 'gno.land/r/other/xgns' }] }),
      text('You have exactly one xGNS asset.'), done({ finishReason: 'stop', verifiedAnswer: true })
    );
    expect(answer[0]).toContain('Multiple assets match xGNS. Choose an asset ID:');
    expect(answer[0]).toContain('Some lookups could not be verified.');
    expect(last.verifiedAnswer).toBeUndefined();
    expect(canRememberTurn(last)).toBe(false);

    const unavailable = await guard(
      balance({ status: 'unavailable', assets: [], missing: ['native', 'tokens'] }),
      done({ finishReason: 'stop', verifiedAnswer: true })
    );
    expect(unavailable.answer[0]).toContain('Could not verify all balances.');
    expect(unavailable.last.verifiedAnswer).toBeUndefined();
    expect(canRememberTurn(unavailable.last)).toBe(false);
  });

  it('does not trust a balance when the selected symbol contradicts the user request', async () => {
    const request = { kind: 'one' as const, asset: { kind: 'symbol' as const, value: 'GNS' } };
    const gns = { ...token, assetId: 'gno.land/r/gnoswap/gns', symbol: 'GNS', amount: '1000000' };
    const { answer, last } = await guardFor('What is my xGNS balance?',
      toolCall('get_balance', false, request), balance({ request, assets: [gns] }),
      readOk, text('You have 1 GNS.'), done({ finishReason: 'stop', verifiedAnswer: true })
    );

    expect(answer[0]).toContain('The selected asset differs from the asset mentioned.');
    expect(last.verifiedAnswer).toBeUndefined();
    expect(canRememberTurn(last)).toBe(false);
  });

  it('checks asset-ID selections against mentioned symbols without rejecting an explicitly requested ID', async () => {
    const assetId = 'gno.land/r/gnoswap/gns';
    const request = { kind: 'one' as const, asset: { kind: 'id' as const, value: assetId } };
    const gns = { ...token, assetId, symbol: 'GNS', amount: '1000000' };
    const conflict = await guardFor('What is my xGNS balance?',
      toolCall('get_balance', false, request), balance({ request, assets: [gns] }),
      done({ finishReason: 'stop' })
    );
    expect(conflict.answer[0]).toContain('The selected asset differs from the asset mentioned.');
    expect(canRememberTurn(conflict.last)).toBe(false);

    const explicit = await guardFor(`Compare xGNS with ${assetId}`,
      toolCall('get_balance', false, request), balance({ request, assets: [gns] }),
      done({ finishReason: 'stop' })
    );
    expect(explicit.answer).toEqual(['1 GNS (gno.land/r/gnoswap/gns)']);
    expect(explicit.last.verifiedAnswer).toBe(true);
  });

  it('rejects a malformed normalized result even next to a successful read', async () => {
    const { answer, last } = await guard(
      toolResult('get_balance', { kind: 'result', value: { status: 'complete', assets: [] } }),
      readOk, text('Everything succeeded.'), done({ finishReason: 'stop', verifiedAnswer: true })
    );
    expect(answer).toEqual(['Some lookups could not be verified. Review the individual tool results.']);
    expect(last.verifiedAnswer).toBeUndefined();
    expect(canRememberTurn(last)).toBe(false);
  });

  it('reports a prepared transaction in its own words, whatever the model says, and does not remember the turn', async () => {
    const { answer, last } = await guard(toolCall('transfer'), prepared, text('Payment confirmed on chain.'), done());

    expect(answer).toEqual(['Unsigned transaction prepared. Nothing was sent.']);
    expect(last.messages).toEqual([]);
  });

  it.each([
    ['an error result', toolResult('transfer', { kind: 'result', value: { status: 'error', code: 'invalid_address' } })],
    ['a denied call', toolResult('transfer', { kind: 'denied', code: 'BUDGET_EXHAUSTED' })],
    ['a tool error', { type: GenerateEventType.ToolError, id: 'transfer', name: 'transfer', error: 'boom' } as GenerateEvent],
  ])('does not claim a preparation after %s', async (_label, failure) => {
    const { answer } = await guard(toolCall('transfer'), failure, text('Done'), done());

    expect(answer).toEqual(['Transaction preparation was not confirmed.']);
  });

  it.each([
    ['a read that was denied', toolResult('read', { kind: 'denied', code: 'MCP_UNAVAILABLE' })],
    ['a tool error', { type: GenerateEventType.ToolError, id: 'x', name: 'read', error: 'boom' } as GenerateEvent],
    ['an invalid tool call', toolCall('transfer', true)],
  ])('replaces the answer and forgets the turn after %s, even next to a good read', async (_label, failure) => {
    const { answer, last } = await guard(readOk, failure, text('All good'), done());

    expect(answer).toEqual(['Some lookups could not be verified. Review the individual tool results.']);
    expect(last.messages).toEqual([]);
  });

  it('says so when a read ran but the model wrote nothing', async () => {
    expect((await guard(readOk, done())).answer).toEqual(['Data was returned; no model summary was produced.']);
  });

  it('uses only the text of the last step', async () => {
    const { answer } = await guard(text('Let me check'), { type: GenerateEventType.StepStart }, readOk, text('Final'), done());

    expect(answer).toEqual(['Final']);
  });

  it('passes an aborted run through without an answer of its own', async () => {
    const { answer, last } = await guard(text('half an ans'), done({ aborted: true }));

    expect(answer).toEqual([]);
    expect(last.aborted).toBe(true);
  });

  it('still reports a transaction that was prepared before the run was aborted', async () => {
    const { answer } = await guard(prepared, done({ aborted: true }));

    expect(answer).toEqual(['Unsigned transaction prepared. Nothing was sent.']);
  });
});
