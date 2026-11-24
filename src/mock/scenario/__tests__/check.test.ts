import { TransactionType } from '../../../agent';
import { checkSummaries, describeSummaries, explainNothing, type PreparedSummary } from '../check';
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
    expect(checkSummaries([], { kind: 'none' })).toEqual({ ok: true });
    expect(checkSummaries([transfer()], { kind: 'none' })).toMatchObject({ ok: false });
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
