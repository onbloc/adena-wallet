import { canRememberTurn, type GenerateEvent } from '../../llm/core';
import { guardAnswer, type AnswerIntent } from '../answerGuard';
import type { BalanceRequest, BalanceResult } from '../balanceOperation';
import type { RequestIntent } from '../requestIntent';

const request: BalanceRequest = { kind: 'one', asset: { kind: 'symbol', value: 'GNOT' } };
const lookup: RequestIntent = { kind: 'lookup', requests: [{ target: 'balance', request }] };
const history: RequestIntent = { kind: 'lookup', requests: [{ target: 'other', query: 'List transactions.' }] };
const prepare: AnswerIntent = { kind: 'prepare', action: 'transfer' };
const value: BalanceResult = { account: 'account', chainId: 'chain', request, status: 'complete', missing: [], assets: [{ kind: 'native', assetId: 'ugnot', symbol: 'GNOT', amount: '42000000', decimals: 6 }] };
const done = (overrides: Partial<Extract<GenerateEvent, { type: 'done' }>> = {}): GenerateEvent => ({ type: 'done', aborted: false, finishReason: 'stop', warnings: [], messages: [], metrics: { totalMs: 1, ttftMs: null }, ...overrides });
const call = (name: string, input: unknown = {}, id = name): GenerateEvent => ({ type: 'tool-call', name, input, id, invalid: false });
const result = (name: string, output: unknown, id = name): GenerateEvent => ({ type: 'tool-result', name, output, id });
const balance = (overrides: Partial<BalanceResult> = {}): GenerateEvent => result('get_balance', { kind: 'result', value: { ...value, ...overrides } });
const text = (delta: string): GenerateEvent => ({ type: 'text', delta });
async function guard(intent: AnswerIntent, events: GenerateEvent[], policy: { requiredReads?: string[]; userText?: string } = {}) {
  const output: GenerateEvent[] = [];
  for await (const event of guardAnswer((async function* () { yield* events; })(), name => name !== 'transfer' && name !== 'approve', intent, policy)) output.push(event);
  return { text: output.filter(event => event.type === 'text').map(event => event.delta).join(''), done: output.find(event => event.type === 'done') as Extract<GenerateEvent, { type: 'done' }> };
}

describe('required normalized outcomes', () => {
  it('does not render or verify an unselected read beside a required result', async () => {
    const answer = await guard(history, [
      call('history'), result('history', { kind: 'result', value: { items: [] } }),
      call('unrelated'), result('unrelated', { kind: 'result', value: { secret: 'irrelevant' } }), done(),
    ], { requiredReads: ['history'] });
    expect(answer.done.verifiedAnswer).not.toBe(true);
    expect(answer.text).not.toContain('irrelevant');
  });
  it('does not treat a successful read with no returned value as evidence', async () => {
    const answer = await guard(history, [call('history'), result('history', { kind: 'result' }), done()], { requiredReads: ['history'] });
    expect(answer.done.verifiedAnswer).not.toBe(true);
    expect(answer.text).toContain('could not be verified');
  });


  it('renders exact validated units rather than model arithmetic or settlement claims', async () => {
    const answer = await guard(lookup, [call('get_balance', request), balance(), text('You have 42000000 GNOT. Payment sent.'), done()]);
    expect(answer.text).toBe('42 GNOT');
    expect(answer.done.verifiedAnswer).toBe(true);
    expect(canRememberTurn(answer.done)).toBe(true);
  });
  it('requires every distinct balance request and preserves all amounts', async () => {
    const token: BalanceRequest = { kind: 'one', asset: { kind: 'symbol', value: 'xGNS' } };
    const intent: RequestIntent = { kind: 'lookup', requests: [{ target: 'balance', request }, { target: 'balance', request: token }] };
    const incomplete = await guard(intent, [balance(), done()]);
    expect(incomplete.text).toContain('42 GNOT');
    expect(canRememberTurn(incomplete.done)).toBe(false);
    const complete = await guard(intent, [balance(), balance({ request: token, assets: [{ kind: 'token', assetId: 'realm/xgns', symbol: 'xGNS', amount: '17528', decimals: 0 }] }), done({ finishReason: 'tool-calls' })]);
    expect(complete.text).toContain('17528 xGNS (realm/xgns)');
    expect(complete.text).toContain('42 GNOT');
    expect(canRememberTurn(complete.done)).toBe(true);
  });
  it('does not accept a balance as completion of an unrelated history request', async () => {
    const answer = await guard(history, [balance(), text('All transactions shown.'), done()], { requiredReads: ['list_account_transactions'] });
    expect(answer.done.verifiedAnswer).toBeUndefined();
    expect(canRememberTurn(answer.done)).toBe(false);
    expect(answer.text).not.toContain('All transactions shown.');
  });
  it('requires an explicit nonempty selection for generic queries', async () => {
    const answer = await guard(history, [result('unrelated', { kind: 'result', value: 1 }), done()]);
    expect(canRememberTurn(answer.done)).toBe(false);
  });
  it('identifies an unavailable capability even when a separate balance read fails', async () => {
    const intent: RequestIntent = { kind: 'lookup', requests: [{ target: 'balance', request }, { target: 'other', query: 'List my approvals.' }] };
    const answer = await guard(intent, [balance({ status: 'unavailable', missing: ['native'], assets: [] }), done()], { requiredReads: [] });
    expect(answer.text).toContain('could not be verified');
    expect(answer.text).toContain('Unable to complete the requested lookup: List my approvals.');
    expect(answer.done.verifiedAnswer).toBeUndefined();
  });
  it('preserves nonbalance facts next to exact amounts without using model summaries', async () => {
    const intent: RequestIntent = { kind: 'lookup', requests: [{ target: 'balance', request }, { target: 'other', query: 'List history.' }] };
    const answer = await guard(intent, [balance(), result('list_account_transactions', { kind: 'result', value: { items: [{ hash: 'tx-123', status: 'pending' }] } }), text('Confirmed tx-999.'), done()], { requiredReads: ['list_account_transactions'] });
    expect(answer.text).toContain('42 GNOT');
    expect(answer.text).toContain('tx-123');
    expect(answer.text).toContain('pending');
    expect(answer.text).not.toContain('tx-999');
    expect(canRememberTurn(answer.done)).toBe(true);
  });
  it('preserves different pages returned by the same tool in one step', async () => {
    const answer = await guard(history, [
      call('list_account_transactions', { cursor: null }, 'first'), call('list_account_transactions', { cursor: 'next' }, 'next'),
      result('list_account_transactions', { kind: 'result', value: { hash: 'tx-first' } }, 'first'),
      result('list_account_transactions', { kind: 'result', value: { hash: 'tx-next' } }, 'next'), done(),
    ], { requiredReads: ['list_account_transactions'] });
    expect(answer.text).toContain('tx-first');
    expect(answer.text).toContain('tx-next');
    expect(canRememberTurn(answer.done)).toBe(true);
  });
  it.each<Partial<BalanceResult>>([
    { request: { kind: 'all' }, status: 'partial', missing: ['tokens'] },
    { request: { kind: 'all' }, status: 'unavailable', missing: ['native', 'tokens'], assets: [] },
    { status: 'ambiguous', assets: [{ ...value.assets[0], assetId: 'first' }, { ...value.assets[0], assetId: 'second' }] },
  ])('does not trust a $status result', async override => {
    const intent: RequestIntent = { kind: 'lookup', requests: [{ target: 'balance', request: override.request ?? request }] };
    const answer = await guard(intent, [balance(override), done({ verifiedAnswer: true })]);
    expect(answer.done.verifiedAnswer).toBeUndefined();
    expect(canRememberTurn(answer.done)).toBe(false);
  });
  it('rejects malformed balances even beside another successful read', async () => {
    const answer = await guard(lookup, [result('get_balance', { kind: 'result', value: { status: 'complete', assets: [] } }), result('read', { kind: 'result', value: 1 }), done()]);
    expect(canRememberTurn(answer.done)).toBe(false);
  });
  it('rejects contradictory balances and differing account or chain contexts', async () => {
    for (const override of [
      { assets: [{ ...value.assets[0], amount: '43000000' }] },
      { account: 'another-account' },
      { chainId: 'another-chain' },
    ]) {
      const answer = await guard(lookup, [balance(), balance(override), done({ verifiedAnswer: true })]);
      expect(answer.text).toContain('Balance lookups returned conflicting results.');
      expect(answer.text).not.toContain('42 GNOT');
      expect(answer.text).not.toContain('43 GNOT');
      expect(answer.done.verifiedAnswer).toBeUndefined();
      expect(canRememberTurn(answer.done)).toBe(false);
    }
  });
  it('accepts equivalent amounts with leading zeroes', async () => {
    const answer = await guard(lookup, [balance(), balance({ assets: [{ ...value.assets[0], amount: '042000000' }] }), done()]);
    expect(answer.text).not.toContain('conflicting');
    expect(answer.done.verifiedAnswer).toBe(true);
  });
  it.each(['What is my GNS balance?', '내 gns 잔액은?'])('rejects a prefixed asset for %s', async userText => {
    const wrapped = { kind: 'one', asset: { kind: 'symbol', value: 'XGNS' } } as const;
    const intent: RequestIntent = { kind: 'lookup', requests: [{ target: 'balance', request: wrapped }] };
    const answer = await guard(intent, [call('get_balance', wrapped), balance({
      request: wrapped, assets: [{ kind: 'token', assetId: 'realm/xgns', symbol: 'xGNS', amount: '17528', decimals: 0 }],
    }), done()], { userText });
    expect(answer.text).toContain('selected asset differs');
    expect(answer.text).not.toContain('17528 xGNS');
    expect(canRememberTurn(answer.done)).toBe(false);
  });
  it('allows both the underlying and prefixed asset to be mentioned', async () => {
    const wrapped = { kind: 'one', asset: { kind: 'symbol', value: 'XGNS' } } as const;
    const intent: RequestIntent = { kind: 'lookup', requests: [{ target: 'balance', request: wrapped }] };
    const answer = await guard(intent, [call('get_balance', wrapped), balance({
      request: wrapped, assets: [{ kind: 'token', assetId: 'realm/xgns', symbol: 'xGNS', amount: '17528', decimals: 0 }],
    }), done()], { userText: 'Compare GNS and xGNS' });
    expect(answer.text).toContain('17528 xGNS');
    expect(answer.done.verifiedAnswer).toBe(true);
  });
  it('does not trust a symbol embedded inside the requested symbol or an unrelated ID', async () => {
    const gns = { kind: 'one', asset: { kind: 'symbol', value: 'GNS' } } as const;
    const intent: RequestIntent = { kind: 'lookup', requests: [{ target: 'balance', request: gns }] };
    const gnsResult = { request: gns, assets: [{ kind: 'token' as const, assetId: 'realm/gns', symbol: 'GNS', amount: '1', decimals: 0 }] };
    const conflict = await guard(intent, [call('get_balance', gns), balance(gnsResult), done()], { userText: 'What is my xGNS balance?' });
    expect(canRememberTurn(conflict.done)).toBe(false);
    expect(conflict.text).toContain('selected asset differs');
    const byId = { kind: 'one', asset: { kind: 'id', value: 'realm/gns' } } as const;
    const explicit = await guard({ kind: 'lookup', requests: [{ target: 'balance', request: byId }] }, [call('get_balance', byId), balance({ ...gnsResult, request: byId }), done()], { userText: 'Compare xGNS with realm/gns.' });
    expect(canRememberTurn(explicit.done)).toBe(true);
  });
  it('matches returned balance requests to their originating calls', async () => {
    const other = { kind: 'one', asset: { kind: 'symbol', value: 'xGNS' } } as const;
    const answer = await guard(lookup, [call('get_balance', other), balance(), done()]);
    expect(canRememberTurn(answer.done)).toBe(false);
  });
  it('requires requested explanation text without replacing current facts', async () => {
    const intent: RequestIntent = { kind: 'lookup', requests: [{ target: 'balance', request }], explanation: 'What is GNOT?' };
    const missing = await guard(intent, [balance(), done()]);
    expect(missing.text).toContain('42 GNOT');
    expect(canRememberTurn(missing.done)).toBe(false);
    const complete = await guard(intent, [balance(), text('GNOT is native to Gno.land.'), done()]);
    expect(complete.text).toContain('GNOT is native to Gno.land.');
    expect(complete.text).toContain('42 GNOT');
    expect(canRememberTurn(complete.done)).toBe(true);
  });
  it.each<AnswerIntent>([{ kind: 'explanation' }, { kind: 'clarification' }])('retains tool-free $kind as unverified text', async intent => {
    const answer = await guard(intent, [text('Which recipient?'), done({ messages: [{ role: 'assistant', content: 'Which recipient?' }] })]);
    expect(answer.done.verifiedAnswer).toBeUndefined();
    expect(canRememberTurn(answer.done)).toBe(true);
    expect(answer.done.warnings.length).toBeGreaterThan(0);
  });
  it('keeps preparation results and audit failure independent of model settlement claims', async () => {
    const answer = await guard(prepare, [call('transfer'), result('transfer', { kind: 'result', value: { status: 'prepared' }, auditFailed: true }), text('Payment confirmed.'), done()]);
    expect(answer.text).toContain('Unsigned transaction prepared');
    expect(answer.text).not.toContain('Payment confirmed');
    expect(answer.done.warnings.some(warning => warning.includes('Audit'))).toBe(true);
    expect(canRememberTurn(answer.done)).toBe(false);
  });
  it('never converts wallet refusal or successful reads into preparation success', async () => {
    const refusal = await guard(prepare, [result('transfer', { kind: 'result', value: { status: 'error', message: 'Insufficient balance.' } }), text('Success.'), done()]);
    expect(refusal.text).toContain('Insufficient balance.');
    expect(refusal.text).not.toContain('Unsigned transaction prepared');
    const readOnly = await guard(prepare, [balance(), text('Ready.'), done()]);
    expect(readOnly.text).not.toContain('Ready.');
    expect(canRememberTurn(readOnly.done)).toBe(false);
  });
  it('does not remember unfinished or aborted work, but reports an already handed-off transaction', async () => {
    expect(canRememberTurn((await guard(lookup, [balance(), call('read'), done()])).done)).toBe(false);
    const aborted = await guard(lookup, [balance(), done({ aborted: true, verifiedAnswer: true })]);
    expect(aborted.text).toBe('');
    expect(canRememberTurn(aborted.done)).toBe(false);
    const handedOff = await guard(prepare, [result('transfer', { kind: 'result', value: { status: 'prepared' } }), done({ aborted: true })]);
    expect(handedOff.text).toContain('Unsigned transaction prepared');
    expect(canRememberTurn(handedOff.done)).toBe(false);
  });
});
