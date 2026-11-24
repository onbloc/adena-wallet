// Scenario tests: a real model turns plain-language requests into transactions. They need a
// running llama-server and are not part of `npm test`; run them with `make scenario`.
import { TransactionType, toBaseUnits } from '../../agent';
import {
  ACCOUNT,
  GNS_PATH,
  adenaTransaction,
  createScenarioRunner,
  firstMessage,
  serverUrl,
  type ScenarioRun,
  type ScenarioRunner,
} from './harness';
import { SCENARIOS, type Expected } from './scenarios';

// A slow on-device-sized model: the agent's own run budget is 5 minutes.
jest.setTimeout(5 * 60_000);

// Every token in the scenarios has 6 decimals.
const DECIMALS = 6;

/** The prepared transaction is exactly the requested one, in its summary and in the message it will sign. */
function expectTransaction(run: ScenarioRun, expected: Exclude<Expected, { kind: 'none' }>) {
  expect(run.prepared).toHaveLength(1);
  const [prepared] = run.prepared;
  const base = String(toBaseUnits(expected.amount, DECIMALS));

  if (expected.kind === 'transfer') {
    expect(prepared.summary).toMatchObject({
      type: TransactionType.Transfer,
      from: ACCOUNT,
      to: expected.to,
      amount: expected.amount,
      token: expected.token,
    });
    expect(firstMessage(prepared)).toMatchObject(
      expected.token === 'GNOT'
        ? { type: '/bank.MsgSend', value: { from_address: ACCOUNT, to_address: expected.to, amount: `${base}ugnot` } }
        : { type: '/vm.m_call', value: { caller: ACCOUNT, pkg_path: GNS_PATH, func: 'Transfer', args: [expected.to, base] } }
    );
  } else {
    expect(prepared.summary).toMatchObject({
      type: TransactionType.Allowance,
      from: ACCOUNT,
      spender: expected.spender,
      amount: expected.amount,
      token: expected.token,
    });
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
      runner = await createScenarioRunner();
    } catch (error) {
      throw new Error(`${String(error)}\nStart the server with \`make scenario\`, or set SCENARIO_URL (now ${serverUrl()}).`);
    }
  });

  it.each(SCENARIOS)('$name', async ({ prompt, expected }) => {
    const run = await runner.ask(prompt);
    const context = `prompt: ${prompt}\ncalls: ${JSON.stringify(run.calls)}\nanswer: ${run.text}`;

    try {
      // Only outcomes matter; a corrected tool-call retry must not fail the scenario.
      for (const prepared of run.prepared) expect(adenaTransaction(prepared).signatures).toEqual([]);

      if (expected.kind === 'none') {
        expect(run.prepared).toEqual([]);
      } else {
        expectTransaction(run, expected);
      }
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
