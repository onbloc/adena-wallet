// Real-model edge cases with controlled read results; no transaction is signed or broadcast.
import { fakeOnblocMcp } from '../../harness/mcp/testing/fakeOnblocMcp';
import { checkScenarioRun } from './check';
import { ACCOUNT, CAROL, GNS_PATH, createEnvScenarioRunner } from './harness';

jest.setTimeout(5 * 60_000);

const balances = (native: string, tokens: unknown[]) => [
  { name: 'get_native_balance', output: { address: ACCOUNT, denom: 'ugnot', balance: native } },
  { name: 'get_token_balances', output: { address: ACCOUNT, items: tokens } },
];
const token = (symbol: string, path: string, amount: string) =>
  ({ address: ACCOUNT, tokenId: path, packagePath: path, symbol, amount, decimals: 6 });

describe('real-model read and arithmetic edges', () => {
  it('R1 distinguishes xGNS from GNS', async () => {
    const runner = await createEnvScenarioRunner(true, () => fakeOnblocMcp(balances('10000000', [
      token('GNS', GNS_PATH, '250000000'),
      token('xGNS', 'gno.land/r/gnoswap/xgns', '7000000'),
    ])));
    const turn = await runner.ask('How much xGNS do I have?');
    expect(checkScenarioRun(turn, { kind: 'none', response: 'read-only', evidence: [/xGNS/i, /\b7\b/] })).toEqual({ ok: true });
    expect(turn.text).not.toMatch(/\b250\s+GNS\b/i);
  });

  it('T7 refuses to round half of an indivisible minimum unit', async () => {
    const runner = await createEnvScenarioRunner(true, () => fakeOnblocMcp(balances('1', [])));
    const turn = await runner.ask('Send exactly half of my GNOT to carol. Do not round.');
    expect(checkScenarioRun(turn, {
      kind: 'none', response: 'refusal', evidence: [/half|0\.0000005|precision|unit|divis|round/i],
    })).toEqual({ ok: true });
  });

  it('T7 does not guess half when the balance lookup fails', async () => {
    const runner = await createEnvScenarioRunner(true, () => fakeOnblocMcp([
      { name: 'get_native_balance', isError: true, content: [{ type: 'text', text: 'Balance service unavailable' }] },
      { name: 'get_token_balances', output: { address: ACCOUNT, items: [] } },
    ]));
    const turn = await runner.ask('Send half of my GNOT to carol.');
    expect(checkScenarioRun(turn, {
      kind: 'none', response: 'refusal', evidence: [/balance|lookup|service/i],
    })).toEqual({ ok: true });
  });

  it('R7 reads the latest three transactions rather than preparing one', async () => {
    const runner = await createEnvScenarioRunner(true, () => fakeOnblocMcp([
      { name: 'list_account_transactions', output: { address: ACCOUNT, items: [
        { hash: 'LATESTONE', height: 300 }, { hash: 'LATESTTWO', height: 299 }, { hash: 'LATESTTHREE', height: 298 },
        { hash: 'OLDERFOUR', height: 297 },
      ], nextCursor: null } },
    ]));
    const turn = await runner.ask('Show my latest 3 transactions.');
    expect(checkScenarioRun(turn, {
      kind: 'none', response: 'read-only', evidence: [/LATESTONE/i, /LATESTTWO/i, /LATESTTHREE/i],
    })).toEqual({ ok: true });
    expect(turn.text).not.toMatch(/OLDERFOUR/i);
    expect(turn.calls).toContainEqual(expect.objectContaining({
      name: 'list_account_transactions', invalid: false, input: expect.objectContaining({ limit: 3 }),
    }));
  });

  it('R7 does not create an approval when asked to read existing approvals', async () => {
    const runner = await createEnvScenarioRunner();
    const turn = await runner.ask(`Show my existing token approvals for ${CAROL}. Do not create an approval.`);
    expect(checkScenarioRun(turn, {
      kind: 'none', response: 'refusal', evidence: [/approv|allowance/i, /cannot|can't|unable|unavailable|not |no |support/i],
    })).toEqual({ ok: true });
  });
});
