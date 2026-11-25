import { TransactionType } from '../../../agent';
import { checkRun, checkScenarioRun, checkSummaries, describeSummaries, explainNothing, type JudgedRun, type PreparedSummary } from '../check';
import { ACCOUNT, CAROL, RECIPIENT } from '../fixture';

const transfer = (overrides: Partial<Extract<PreparedSummary, { type: typeof TransactionType.Transfer }>> = {}): PreparedSummary => ({
  type: TransactionType.Transfer, chainId: 'c', from: ACCOUNT, to: CAROL, amount: '1', token: 'GNOT', ...overrides,
});
const approval = (overrides: Partial<Extract<PreparedSummary, { type: typeof TransactionType.Allowance }>> = {}): PreparedSummary => ({
  type: TransactionType.Allowance, chainId: 'c', from: ACCOUNT, spender: CAROL, amount: '10', token: 'GNS', ...overrides,
});

const expectTransfer = { kind: 'transfer', to: CAROL, amount: '1', token: 'GNOT' } as const;
const expectApproval = { kind: 'allowance', spender: CAROL, amount: '10', token: 'GNS' } as const;

describe('checkSummaries', () => {
  it('accepts exactly the expected transfer and approval', () => {
    expect(checkSummaries([transfer()], expectTransfer)).toEqual({ ok: true });
    expect(checkSummaries([approval()], expectApproval)).toEqual({ ok: true });
  });

  it('names every field the model got wrong', () => {
    const verdict = checkSummaries([transfer({ to: RECIPIENT, amount: '10' })], expectTransfer);

    expect(verdict).toEqual({ ok: false, reason: `to: got ${RECIPIENT}, expected ${CAROL}; amount: got 10, expected 1` });
  });

  it('does not accept an amount that only looks the same', () => {
    expect(checkSummaries([transfer({ amount: '1.0' })], expectTransfer).ok).toBe(false);
  });

  it('rejects the wrong kind of transaction', () => {
    expect(checkSummaries([approval({ token: 'GNS' })], expectTransfer)).toMatchObject({ ok: false });
    expect(checkSummaries([transfer()], expectApproval)).toMatchObject({ ok: false });
  });

  it('rejects a transaction from another account', () => {
    expect(checkSummaries([transfer({ from: RECIPIENT })], expectTransfer)).toMatchObject({ ok: false, reason: expect.stringContaining('from:') });
  });

  it.each([
    ['nothing', []],
    ['two transactions', [transfer(), transfer()]],
  ])('requires exactly one transaction when one is expected: %s', (_name, prepared) => {
    expect(checkSummaries(prepared, expectTransfer).ok).toBe(false);
  });

  it('accepts no transaction only when none is expected', () => {
    const expected = { kind: 'none', response: 'clarification', evidence: [/recipient/i] } as const;
    expect(checkSummaries([], expected)).toEqual({ ok: true });
    expect(checkSummaries([transfer()], expected)).toMatchObject({ ok: false });
  });
});

describe('checkScenarioRun', () => {
  const turn = (text: string) => ({ prepared: [], calls: [], results: [], text });
  it('accepts an exact draft or a field-specific question for an unambiguous typo', () => {
    const expected = { ...expectTransfer, orClarification: [/action/i] };
    expect(checkScenarioRun(turn('Which action?'), expected).ok).toBe(true);
    expect(checkScenarioRun(turn('Please clarify?'), expected).ok).toBe(false);
    expect(checkScenarioRun({ ...turn(''), prepared: [{ summary: transfer(), tx: {} }] }, expected).ok).toBe(true);
    expect(checkScenarioRun({ ...turn(''), prepared: [{ summary: transfer({ to: RECIPIENT }), tx: {} }] }, expected).ok).toBe(false);
  });
  it.each([
    [{ kind: 'none', response: 'clarification', evidence: [/recipient/i] } as const, 'Which recipient?', 'I sent it to the recipient.'],
    [{ kind: 'none', response: 'refusal', evidence: [/balance/i] } as const, 'Insufficient balance.', 'Your balance is 10 GNOT.'],
    [{ kind: 'none', response: 'explanation', evidence: [/allowance/i, /spend/i] } as const, 'An allowance permits spending.', 'The allowance is ready.'],
    [{ kind: 'none', response: 'read-only', evidence: [/250/, /GNS/] } as const, 'You have 250 GNS.', 'You have 10 GNOT.'],
  ])('requires the expected response and its evidence', (expected, good, wrong) => {
    expect(checkScenarioRun(turn(good), expected)).toEqual({ ok: true });
    expect(checkScenarioRun(turn(''), expected).ok).toBe(false);
    expect(checkScenarioRun(turn(wrong), expected).ok).toBe(false);
  });
  it('preserves bare none and answer oracle verdicts', () => {
    expect(checkScenarioRun(turn(''), { kind: 'none' })).toEqual({ ok: true });
    const expected = { kind: 'answer', reads: [{ name: 'get_balance', input: { kind: 'all' } }], says: ['10 GNOT'] } as const;
    expect(checkScenarioRun({ ...turn('10 GNOT'), calls: [{ name: 'get_balance', input: { kind: 'all' }, invalid: false }] }, expected)).toEqual({ ok: true });
    expect(checkScenarioRun(turn('10 GNOT'), expected)).toEqual({ ok: false, reason: 'did not call get_balance' });
  });
  it('does not allow absent evidence requirements to pass', () => {
    expect(checkScenarioRun(turn('An answer.'), { kind: 'none', response: 'explanation', evidence: [] }).ok).toBe(false);
  });
  it('rejects a transaction even when the response supplies the expected clarification', () => {
    expect(checkScenarioRun(
      { ...turn('Which recipient?'), prepared: [{ summary: transfer(), tx: {} }] },
      { kind: 'none', response: 'clarification', evidence: [/recipient/i] },
    ).ok).toBe(false);
  });
  it('requires the expected wallet error code when a preparation was rejected', () => {
    const expected = { kind: 'none', response: 'refusal', evidence: [/balance/i], errorCodes: ['insufficient_balance'] } as const;
    const result = (code: string) => ({ name: 'transfer', output: { kind: 'result', value: { status: 'error', code } } });
    expect(checkScenarioRun({ ...turn('Balance is too low.'), results: [result('insufficient_balance')] }, expected).ok).toBe(true);
    expect(checkScenarioRun({ ...turn('Balance is too low.'), results: [result('invalid_address')] }, expected).ok).toBe(false);
    expect(checkScenarioRun({ ...turn('Balance is too low.'), results: [result('insufficient_balance'), result('invalid_address')] }, expected).ok).toBe(false);
  });
  it('rejects tool activity for explanations and preparation attempts for reads', () => {
    const call = { name: 'transfer', input: {}, invalid: false };
    expect(checkScenarioRun({ ...turn('An allowance permits spending.'), calls: [call] },
      { kind: 'none', response: 'explanation', evidence: [/allowance/, /spend/] }).ok).toBe(false);
    expect(checkScenarioRun({ ...turn('You have 250 GNS.'), calls: [call] },
      { kind: 'none', response: 'read-only', evidence: [/250/, /GNS/] }).ok).toBe(false);
  });
  it('checks the expected token realm when supplied', () => {
    const expected = { ...expectApproval, packagePath: 'gno.land/r/gnoswap/gns' };
    expect(checkSummaries([approval({ packagePath: 'gno.land/r/gnoswap/gns' })], expected).ok).toBe(true);
    expect(checkSummaries([approval({ packagePath: 'gno.land/r/other/gns' })], expected).ok).toBe(false);
    expect(checkSummaries([approval()], expected).ok).toBe(false);
    const transferExpected = { ...expectTransfer, token: 'GNS' as const, packagePath: 'gno.land/r/gnoswap/gns' };
    expect(checkSummaries([transfer({ token: 'GNS', packagePath: 'gno.land/r/gnoswap/gns' })], transferExpected).ok).toBe(true);
    expect(checkSummaries([transfer({ token: 'GNS', packagePath: 'gno.land/r/other/gns' })], transferExpected).ok).toBe(false);
  });
  it('accepts the observed bilingual clarifications and rejects generic non-answers', () => {
    const recipient = { kind: 'none', response: 'clarification', evidence: [/recipient|address|who|where|받|주소|누구|어디/i] } as const;
    const amount = { kind: 'none', response: 'clarification', evidence: [/amount|how much|quantity|얼마|수량|금액|몇/i] } as const;
    expect(checkScenarioRun(turn('Who should receive the GNOT?'), recipient).ok).toBe(true);
    expect(checkScenarioRun(turn('금액을 알려주세요.'), amount).ok).toBe(true);
    expect(checkScenarioRun(turn('Please try again.'), amount).ok).toBe(false);
  });
});

describe('describeSummaries', () => {
  it('words each transaction and says so when there is none', () => {
    expect(describeSummaries([])).toBe('(no transaction)');
    expect(describeSummaries([transfer(), approval()])).toBe(`transfer 1 GNOT to ${CAROL}; approve 10 GNS for ${CAROL}`);
  });
});

describe('explainNothing', () => {
  const refusal = (code: string, message: string) => ({ kind: 'result', value: { status: 'error', code, message } });

  it('says what the model asked the wallet for and why the wallet refused', () => {
    const spender = `${RECIPIENT}가`;
    const why = explainNothing({
      calls: [{ name: 'approve', input: { spender, amount: '7.5', token: 'GNS' } }],
      results: [{ name: 'approve', output: refusal('invalid_address', 'The address length is not valid.') }],
      text: 'Transaction preparation failed.',
    });

    expect(why).toBe(`the model asked approve(${JSON.stringify({ spender, amount: '7.5', token: 'GNS' })}); the wallet refused: invalid_address - The address length is not valid.`);
  });

  it('uses the last wallet action when the model asked more than once, ignoring reads', () => {
    const why = explainNothing({
      calls: [{ name: 'get_balance', input: {} }, { name: 'transfer', input: { to: 'a' } }, { name: 'transfer', input: { to: 'b' } }],
      results: [{ name: 'transfer', output: refusal('x', 'first') }, { name: 'transfer', output: refusal('y', 'second') }],
      text: '',
    });

    expect(why).toContain('transfer({"to":"b"})');
    expect(why).toContain('y - second');
  });

  it('reports only the request when the wallet did not refuse', () => {
    const why = explainNothing({ calls: [{ name: 'transfer', input: { to: 'a' } }], results: [{ name: 'transfer', output: { kind: 'result', value: { status: 'prepared' } } }], text: '' });

    expect(why).toBe('the model asked transfer({"to":"a"})');
  });

  it('falls back to what the model said when it asked the wallet for nothing', () => {
    expect(explainNothing({ calls: [], results: [], text: ' Who should   receive it? ' })).toBe('the model replied: "Who should receive it?"');
    expect(explainNothing({ calls: [], results: [], text: '   ' })).toBeUndefined();
  });

  it('shortens a long reply', () => {
    expect(explainNothing({ calls: [], results: [], text: 'x'.repeat(200) })).toBe(`the model replied: "${'x'.repeat(120)}..."`);
  });
});

describe('checkRun', () => {
  const call = (name: string, input: unknown = {}, invalid = false) => ({ name, input, invalid });
  const run = (overrides: Partial<JudgedRun> = {}): JudgedRun => ({ prepared: [], calls: [], text: '', ...overrides });
  const gnotOne = { kind: 'one', asset: { kind: 'symbol', value: 'GNOT' } };
  const explanation = { kind: 'answer', reads: [] } as const;
  const balanceRead = { kind: 'answer', reads: [{ name: 'get_balance', input: gnotOne }], says: ['10 GNOT'] } as const;

  it('judges a transaction by its summary', () => {
    expect(checkRun(run({ prepared: [transfer()] }), expectTransfer)).toEqual({ ok: true });
    expect(checkRun(run({ prepared: [transfer({ amount: '2' })] }), expectTransfer)).toEqual({ ok: false, reason: 'amount: got 2, expected 1' });
  });

  it('accepts an answer that called no tool when none was expected', () => {
    expect(checkRun(run({ text: 'GNOT is the native token.' }), explanation)).toEqual({ ok: true });
  });

  it('fails an explanation that called a tool, and names the call', () => {
    const verdict = checkRun(run({ calls: [call('get_balance', { kind: 'all' })] }), explanation);

    expect(verdict).toEqual({ ok: false, reason: 'called get_balance({"kind":"all"}), expected no tool call' });
  });

  it('fails an answer that prepared a transaction', () => {
    expect(checkRun(run({ prepared: [transfer()] }), explanation)).toEqual({ ok: false, reason: `prepared transfer 1 GNOT to ${CAROL}, expected nothing` });
  });

  it('wants each read with its exact input, whatever the order of the keys', () => {
    const reordered = { asset: { value: 'GNOT', kind: 'symbol' }, kind: 'one' };

    expect(checkRun(run({ calls: [call('get_balance', reordered)], text: 'You have 10 GNOT' }), balanceRead)).toEqual({ ok: true });
  });

  it('says what input the model sent when it is not the expected one', () => {
    const all = { kind: 'all' };

    expect(checkRun(run({ calls: [call('get_balance', all)], text: '10 GNOT' }), balanceRead)).toEqual({
      ok: false,
      reason: `get_balance input: got {"kind":"all"}, expected ${JSON.stringify({ asset: { kind: 'symbol', value: 'GNOT' }, kind: 'one' })}`,
    });
  });

  it('fails when a required read was never made', () => {
    expect(checkRun(run({ text: '10 GNOT' }), balanceRead)).toEqual({ ok: false, reason: 'did not call get_balance' });
  });

  it('does not accept a read that was neither required nor allowed', () => {
    const verdict = checkRun(run({ calls: [call('get_balance', gnotOne), call('list_account_transactions')], text: '10 GNOT' }), balanceRead);

    expect(verdict).toEqual({ ok: false, reason: 'called list_account_transactions({}), expected only get_balance' });
  });

  it('lets an allowed read happen without requiring it', () => {
    const expected = { kind: 'answer', reads: [{ name: 'get_token_info' }], allow: ['get_balance'] } as const;

    expect(checkRun(run({ calls: [call('get_token_info')] }), expected)).toEqual({ ok: true });
    expect(checkRun(run({ calls: [call('get_balance'), call('get_token_info')] }), expected)).toEqual({ ok: true });
  });

  it('ignores a call the harness rejected as malformed, which the agent retries', () => {
    const calls = [call('get_balance', { kind: 'one' }, true), call('get_balance', gnotOne)];

    expect(checkRun(run({ calls, text: '10 GNOT' }), balanceRead)).toEqual({ ok: true });
    expect(checkRun(run({ calls: [call('get_balance', {}, true)] }), explanation)).toEqual({ ok: true });
  });

  it('requires the answer to contain every value, and lists the missing ones', () => {
    const expected = { kind: 'answer', reads: [{ name: 'get_balance' }], says: ['10 GNOT', '250 GNS'] } as const;

    expect(checkRun(run({ calls: [call('get_balance')], text: '10 GNOT' }), expected)).toEqual({ ok: false, reason: 'the answer lacks "250 GNS"' });
  });
});
