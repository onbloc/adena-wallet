import { canRememberTurn, GenerateEventType, type GenerateEvent } from '../../llm/core';
import { guardAnswer } from '../answerGuard';
import type { RequestIntent } from '../requestIntent';

const lookup: RequestIntent = { kind: 'lookup', target: 'other' };
const explanation: RequestIntent = { kind: 'explanation' };
const transfer: RequestIntent = { kind: 'prepare', action: 'transfer' };

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
const toolCall = (name: string, invalid = false): Extract<GenerateEvent, { type: typeof GenerateEventType.ToolCall }> => ({
  type: GenerateEventType.ToolCall,
  id: name,
  name,
  input: {},
  invalid,
});
const toolResult = (name: string, output: unknown): Extract<GenerateEvent, { type: typeof GenerateEventType.ToolResult }> => ({
  type: GenerateEventType.ToolResult,
  id: name,
  name,
  output,
});
const readOk = toolResult('read', { kind: 'result', value: 1 });
const prepared = toolResult('transfer', { kind: 'result', value: { status: 'prepared' } });

async function guard(intent: RequestIntent, ...events: GenerateEvent[]) {
  const out: GenerateEvent[] = [];
  for await (const event of guardAnswer(
    (async function* () {
      yield* events;
    })(),
    isRead,
    intent
  )) {
    out.push(event);
  }
  const answer = out.filter((event) => event.type === GenerateEventType.Text).map((event) => event.delta);
  return { out, answer, last: out[out.length - 1] as Extract<GenerateEvent, { type: 'done' }> };
}

describe('guardAnswer', () => {
  it('shows the model text and remembers the turn when a read succeeded', async () => {
    const { answer, last } = await guard(lookup, toolCall('read'), readOk, text('You have 5 GNOT'), done());

    expect(answer).toEqual(['You have 5 GNOT']);
    expect(last.messages).toHaveLength(1);
  });

  it('keeps a tool-free explanation in the conversation without marking it as verified wallet data', async () => {
    const { answer, last } = await guard(explanation, text('GNOT is the native token; ugnot is its base unit.'), done({ finishReason: 'stop' }));

    expect(answer).toEqual(['GNOT is the native token; ugnot is its base unit.']);
    expect(last.verifiedAnswer).toBeUndefined();
    expect(canRememberTurn(last)).toBe(true);
  });

  it('reports a failed lookup even when no lookup succeeded, and does not remember it', async () => {
    const { answer, last } = await guard(lookup,
      toolCall('read'), toolResult('read', { kind: 'denied', code: 'MCP_UNAVAILABLE' }),
      text('Your balance is zero.'), done({ finishReason: 'stop' })
    );

    expect(answer).toEqual(['Some Onbloc lookups failed. Review the individual tool results.']);
    expect(canRememberTurn(last)).toBe(false);
  });

  it('does not treat an unfinished tool call as a tool-free explanation', async () => {
    const { answer, last } = await guard(lookup, toolCall('read'), text('Everything is fine.'), done({ finishReason: 'stop' }));

    expect(answer).not.toContain('Everything is fine.');
    expect(canRememberTurn(last)).toBe(false);
  });

  it('formats balances even when another successful read would otherwise allow the model summary through', async () => {
    const { answer, last } = await guard({ kind: 'lookup', target: 'portfolio' },
      toolResult('get_native_balance', { kind: 'result', value: { untrustedData: { denom: 'ugnot', balance: '44289888655' } } }),
      toolResult('get_nfts_balance', { kind: 'result', value: { untrustedData: { items: [] } } }),
      toolResult('get_token_balances', { kind: 'result', value: { untrustedData: {
        items: [{ symbol: 'xGNS', tokenId: 'gno.land/r/xgns', amount: '17528000000', decimals: 6 }],
      } } }),
      text('Networking token: 44289888655. xGNS: 17528000000.'), done({ finishReason: 'stop' })
    );

    expect(answer).toEqual(['44289.888655 GNOT\n\nGRC20 balances:\n- 17528 xGNS (gno.land/r/xgns)']);
    expect(last.verifiedAnswer).toBe(true);
    expect(canRememberTurn(last)).toBe(true);
  });

  it('shows the verified part of a mixed lookup but does not save a partially failed turn', async () => {
    const { answer, last } = await guard(lookup,
      toolResult('get_native_balance', { kind: 'result', value: { untrustedData: { denom: 'ugnot', balance: '1000000' } } }),
      toolResult('get_nfts_balance', { kind: 'denied', code: 'MCP_UNAVAILABLE' }),
      text('Everything succeeded.'), done({ finishReason: 'stop' })
    );

    expect(answer).toEqual(['1 GNOT\n\nSome Onbloc lookups failed. Review the individual tool results.']);
    expect(last.verifiedAnswer).toBeUndefined();
    expect(canRememberTurn(last)).toBe(false);
  });

  it('does not remember a balance turn while another lookup remains unfinished', async () => {
    const { last } = await guard(lookup,
      toolResult('get_native_balance', { kind: 'result', value: { untrustedData: { denom: 'ugnot', balance: '1000000' } } }),
      toolCall('get_nfts_balance'), text('Everything succeeded.'), done({ finishReason: 'stop' })
    );

    expect(last.verifiedAnswer).toBeUndefined();
    expect(canRememberTurn(last)).toBe(false);
  });

  it('reports a prepared transaction in its own words, whatever the model says, and does not remember the turn', async () => {
    const { answer, last } = await guard(transfer, toolCall('transfer'), prepared, text('Payment confirmed on chain.'), done());

    expect(answer).toEqual(['Unsigned transaction prepared. Nothing was sent.']);
    expect(last.messages).toEqual([]);
  });

  it.each([
    ['an error result', toolResult('transfer', { kind: 'result', value: { status: 'error', code: 'invalid_address' } })],
    ['a denied call', toolResult('transfer', { kind: 'denied', code: 'BUDGET_EXHAUSTED' })],
    ['a tool error', { type: GenerateEventType.ToolError, id: 'transfer', name: 'transfer', error: 'boom' } as GenerateEvent],
  ])('does not claim a preparation after %s', async (_label, failure) => {
    const { answer } = await guard(transfer, toolCall('transfer'), failure, text('Done'), done());

    expect(answer).toEqual(['Transaction preparation was not confirmed.']);
  });

  it.each([
    ['a read that was denied', toolResult('read', { kind: 'denied', code: 'MCP_UNAVAILABLE' })],
    ['a read returning an error status', toolResult('read', { kind: 'result', value: { status: 'error' } })],
    ['a tool error', { type: GenerateEventType.ToolError, id: 'x', name: 'read', error: 'boom' } as GenerateEvent],
    ['an invalid tool call', toolCall('transfer', true)],
  ])('replaces the answer and forgets the turn after %s, even next to a good read', async (_label, failure) => {
    const { answer, last } = await guard(lookup, readOk, failure, text('All good'), done());

    expect(answer).toEqual(['Some Onbloc lookups failed. Review the individual tool results.']);
    expect(last.messages).toEqual([]);
  });

  it('says so when a read ran but the model wrote nothing', async () => {
    expect((await guard(lookup, readOk, done())).answer).toEqual(['Onbloc returned data; no model summary was produced.']);
  });

  it('uses only the text of the last step', async () => {
    const { answer } = await guard(lookup, text('Let me check'), { type: GenerateEventType.StepStart }, readOk, text('Final'), done());

    expect(answer).toEqual(['Final']);
  });

  it('passes an aborted run through without an answer of its own', async () => {
    const { answer, last } = await guard(explanation, text('half an ans'), done({ aborted: true }));

    expect(answer).toEqual([]);
    expect(last.aborted).toBe(true);
  });

  it('still reports a transaction that was prepared before the run was aborted', async () => {
    const { answer } = await guard(transfer, prepared, done({ aborted: true }));

    expect(answer).toEqual(['Unsigned transaction prepared. Nothing was sent.']);
  });

  it('reports the requested approval outcome without claiming it was sent', async () => {
    const { answer, last } = await guard({ kind: 'prepare', action: 'approve' },
      toolCall('approve'), toolResult('approve', { kind: 'result', value: { status: 'prepared' } }),
      text('The approval was sent.'), done({ finishReason: 'stop' }));

    expect(answer).toEqual(['Unsigned transaction prepared. Nothing was sent.']);
    expect(last.verifiedAnswer).toBeUndefined();
    expect(canRememberTurn(last)).toBe(false);
  });

  it.each<RequestIntent>([{ kind: 'explanation' }, { kind: 'clarification' }])(
    'allows tool-free model text for $kind',
    async intent => {
      const { answer, last } = await guard(intent, text('Which recipient should receive the transfer?'), done({ finishReason: 'stop' }));

      expect(answer).toEqual(['Which recipient should receive the transfer?']);
      expect(last.warnings).toContain('No wallet lookup was performed; this is an unverified model explanation.');
      expect(last.verifiedAnswer).toBeUndefined();
      expect(canRememberTurn(last)).toBe(true);
    }
  );

  it.each<RequestIntent>([
    { kind: 'lookup', target: 'native_balance' },
    { kind: 'lookup', target: 'token_balances' },
    { kind: 'lookup', target: 'portfolio' },
    { kind: 'lookup', target: 'other' },
  ])('rejects a tool-free $target lookup instead of remembering model balances', async intent => {
    const { answer, last } = await guard(intent, text('Your balance is 10 GNOT.'), done({ finishReason: 'stop', verifiedAnswer: true }));

    expect(answer).toEqual(['The required wallet lookup did not complete successfully.']);
    expect(last.messages).toEqual([]);
    expect(last.verifiedAnswer).toBeUndefined();
    expect(canRememberTurn(last)).toBe(false);
  });

  it.each(['transfer', 'approve'] as const)('rejects model-only %s preparation claims', async action => {
    const { answer, last } = await guard({ kind: 'prepare', action }, text('Done. The transaction is ready.'), done({ finishReason: 'stop' }));

    expect(answer).toEqual(['No transaction was prepared. The requested preparation did not complete.']);
    expect(last.messages).toEqual([]);
    expect(last.verifiedAnswer).toBeUndefined();
    expect(canRememberTurn(last)).toBe(false);
  });

  it('does not let a successful read satisfy a requested preparation', async () => {
    const { answer, last } = await guard(transfer, readOk, text('Done.'), done({ finishReason: 'stop' }));

    expect(answer).toEqual(['No transaction was prepared. The requested preparation did not complete.']);
    expect(canRememberTurn(last)).toBe(false);
  });

  it.each([
    ['native_balance', 'get_token_balances', { items: [] }, 'No GRC20 balances returned.'],
    ['token_balances', 'get_native_balance', { denom: 'ugnot', balance: '1000000' }, '1 GNOT'],
    ['portfolio', 'get_native_balance', { denom: 'ugnot', balance: '1000000' }, '1 GNOT'],
  ] as const)('does not trust %s when only %s succeeded', async (target, name, untrustedData, formatted) => {
    const { answer, last } = await guard({ kind: 'lookup', target },
      toolResult(name, { kind: 'result', value: { untrustedData } }), text('Everything succeeded.'), done({ finishReason: 'stop' }));

    expect(answer).toEqual([`${formatted}\n\nThe required wallet lookup did not complete successfully.`]);
    expect(last.verifiedAnswer).toBeUndefined();
    expect(canRememberTurn(last)).toBe(false);
  });

  it('does not treat malformed required balances as a successful lookup', async () => {
    const { answer, last } = await guard({ kind: 'lookup', target: 'native_balance' },
      toolResult('get_native_balance', { kind: 'result', value: { untrustedData: { balance: '-1', denom: 'ugnot' } } }),
      text('You have zero GNOT.'), done({ finishReason: 'stop' }));

    expect(answer).toEqual(['Some Onbloc lookups failed. Review the individual tool results.']);
    expect(last.verifiedAnswer).toBeUndefined();
    expect(canRememberTurn(last)).toBe(false);
  });

  it('filters a requested token balance before rendering it', async () => {
    const { answer, last } = await guard({ kind: 'lookup', target: 'token_balances', token: 'xGNS' },
      toolResult('get_token_balances', { kind: 'result', value: { untrustedData: { items: [
        { symbol: 'xGNS', tokenId: 'gno.land/r/xgns', amount: '17528000000', decimals: 6 },
        { symbol: 'OTHER', tokenId: 'gno.land/r/other', amount: '1000000', decimals: 6 },
      ] } } }), done({ finishReason: 'stop', messages: [] }));

    expect(answer).toEqual(['17528 xGNS (gno.land/r/xgns)']);
    expect(last.verifiedAnswer).toBe(true);
    expect(canRememberTurn(last)).toBe(true);
  });

  it.each<RequestIntent>([
    { kind: 'prepare', action: 'approve' },
    { kind: 'lookup', target: 'other' },
    { kind: 'explanation' },
  ])('surfaces unexpected prepared effects for $kind without trusting them', async intent => {
    const { answer, last } = await guard(intent, readOk, prepared, text('Approval completed.'), done({ finishReason: 'stop' }));

    expect(answer[0]).toContain('Unsigned transaction prepared. Nothing was sent.');
    expect(answer[0]).toContain('Tool results did not match the requested action and are not trusted.');
    expect(answer[0]).not.toContain('Approval completed.');
    expect(last.verifiedAnswer).toBeUndefined();
    expect(canRememberTurn(last)).toBe(false);
  });

  it('does not trust a result whose tool name differs from its call', async () => {
    const { answer, last } = await guard(transfer,
      { ...toolCall('approve'), id: 'operation' },
      { ...prepared, id: 'operation' }, text('Done.'), done({ finishReason: 'stop' }));

    expect(answer[0]).toContain('Unsigned transaction prepared. Nothing was sent.');
    expect(answer[0]).toContain('Tool results did not match the requested action and are not trusted.');
    expect(canRememberTurn(last)).toBe(false);
  });

  it('surfaces a prepared status even when returned under a read tool name', async () => {
    const { answer, last } = await guard(lookup,
      toolResult('read', { kind: 'result', value: { status: 'prepared' } }), done({ finishReason: 'stop' }));

    expect(answer[0]).toContain('Unsigned transaction prepared. Nothing was sent.');
    expect(answer[0]).toContain('Tool results did not match the requested action and are not trusted.');
    expect(canRememberTurn(last)).toBe(false);
  });
});
