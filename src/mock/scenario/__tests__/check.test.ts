import { TransactionType } from '../../../agent';
import { checkSummaries, describeSummaries, type PreparedSummary } from '../check';
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
