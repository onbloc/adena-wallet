// Scenario tests: a real model turns plain-language requests into transactions. They need a
// running llama-server and are not part of `npm test`; run them with `make scenario`.
import { toBaseUnits } from '../../agent';
import { checkRun } from './check';
import {
  GNS_PATH,
  ACCOUNT,
  adenaTransaction,
  createServerScenarioRunner,
  firstMessage,
  serverUrl,
  type ScenarioRun,
  type ScenarioRunner,
} from './harness';
import { EXTRA_SCENARIOS, SCENARIOS, type Expected } from './scenarios';

// A slow on-device-sized model: the agent's own run budget is 5 minutes.
jest.setTimeout(5 * 60_000);

// Every token in the scenarios has 6 decimals.
const DECIMALS = 6;

/** The message the prepared transaction will sign is exactly the requested one. */
function expectMessage(run: ScenarioRun, expected: Extract<Expected, { kind: 'transfer' | 'allowance' }>) {
  const [prepared] = run.prepared;
  expect(adenaTransaction(prepared).messages).toHaveLength(1);
  const base = String(toBaseUnits(expected.amount, DECIMALS));

  if (expected.kind === 'transfer') {
    expect(firstMessage(prepared)).toMatchObject(
      expected.token === 'GNOT'
        ? { type: '/bank.MsgSend', value: { from_address: ACCOUNT, to_address: expected.to, amount: `${base}ugnot` } }
        : { type: '/vm.m_call', value: { caller: ACCOUNT, pkg_path: GNS_PATH, func: 'Transfer', args: [expected.to, base] } }
    );
  } else {
    expect(firstMessage(prepared)).toMatchObject({
      type: '/vm.m_call',
      value: { caller: ACCOUNT, pkg_path: GNS_PATH, func: 'Approve', args: [expected.spender, base] },
    });
  }
}

describe('plain-language requests become transactions', () => {
  let runner: ScenarioRunner;

  beforeAll(async () => {
    try {
      runner = await createServerScenarioRunner();
    } catch (error) {
      throw new Error(`${String(error)}\nStart the server with \`make scenario\`, or set SCENARIO_URL (now ${serverUrl()}).`);
    }
  });

  it.each([...SCENARIOS, ...EXTRA_SCENARIOS])('$name', async ({ prompt, expected, before = [], beforeExpected = [] }) => {
    const turns = await runner.chat([...before, prompt]);
    const run = turns[turns.length - 1];
    const context = `prompts: ${JSON.stringify([...before, prompt])}\ncalls: ${JSON.stringify(run.calls)}\nanswer: ${run.text}`;

    try {
      for (const [index, prior] of beforeExpected.entries()) {
        const turn = turns[index];
        expect(checkRun({ prepared: turn.prepared.map(({ summary }) => summary), calls: turn.calls, text: turn.text }, prior)).toEqual({ ok: true });
        for (const prepared of turn.prepared) expect(adenaTransaction(prepared).signatures).toEqual([]);
        if ((prior.kind === 'transfer' || prior.kind === 'allowance') && turn.prepared.length) expectMessage(turn, prior);
      }
      // Only outcomes matter; a corrected tool-call retry must not fail the scenario.
      for (const prepared of run.prepared) expect(adenaTransaction(prepared).signatures).toEqual([]);

      // The summaries first (what the model chose), then the message that will be signed.
      expect(checkRun({ prepared: run.prepared.map(({ summary }) => summary), calls: run.calls, text: run.text }, expected)).toEqual({ ok: true });
      if ((expected.kind === 'transfer' || expected.kind === 'allowance') && run.prepared.length) expectMessage(run, expected);
    } catch (error) {
      if (error instanceof Error) error.message += `\n\n${context}`;
      throw error;
    }
  });

  it.each([
    { name: 'native balance follow-up', prompts: ['Show me all my assets.', 'What about GNOT?'] },
    {
      name: 'terminology followed by a current balance question',
      prompts: ['Show me all my assets.', 'Is native token the right term? What does it mean?', 'What is my GNOT balance?'],
    },
  ])('$name refreshes native funds without preparing a transaction', async ({ prompts }) => {
    const turns = await runner.chat(prompts);
    const followUp = turns[turns.length - 1];
    const context = turns.map((turn) => `calls: ${JSON.stringify(turn.calls)}\nanswer: ${turn.text}`).join('\n\n');
    try {
      expect(turns.flatMap((turn) => turn.prepared)).toEqual([]);
      expect(followUp.results).toContainEqual({
        name: 'get_balance',
        output: expect.objectContaining({
          kind: 'result',
          value: expect.objectContaining({
            status: 'complete',
            assets: expect.arrayContaining([
              expect.objectContaining({ kind: 'native', assetId: 'ugnot', symbol: 'GNOT', amount: '10000000', decimals: 6 }),
            ]),
          }),
        }),
      });
    } catch (error) {
      if (error instanceof Error) error.message += `\n\n${context}`;
      throw error;
    }
  });
});

describe('read-only wallet with a real model', () => {
  let runner: ScenarioRunner;
  beforeAll(async () => { runner = await createServerScenarioRunner(serverUrl(), false); });

  it('reads GNS in Korean without substituting native funds', async () => {
    const turn = await runner.ask('내 GNS 얼마나 있어?');
    expect(turn.prepared).toEqual([]);
    expect(turn.text).toMatch(/\b250 GNS\b/);
    expect(turn.text).not.toContain('10 GNOT');
  });

  it('cannot hand a transaction to the wallet on a direct send request', async () => {
    const turn = await runner.ask('Send 1 GNOT to carol.');
    expect(turn.prepared).toEqual([]);
  });
});
