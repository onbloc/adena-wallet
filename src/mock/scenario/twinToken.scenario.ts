// Real-model scenarios: two unrelated realms expose the same ticker.
import {
  ACCOUNT, CAROL, GNS_PATH, TWIN_GNS_PATH, mockTransaction, createEnvScenarioRunner,
  fakeReads, firstMessage, twinGnsHoldings, type ScenarioRun, type ScenarioRunner,
} from './harness';

jest.setTimeout(5 * 60_000);

function expectUnsignedB(run: ScenarioRun, func: 'Transfer' | 'Approve', prompt: string, prior: ScenarioRun[] = []) {
  try {
    expect(run.prepared).toHaveLength(1);
    const [prepared] = run.prepared;
    expect(prepared.summary.packagePath).toBe(TWIN_GNS_PATH);
    expect(mockTransaction(prepared).signatures).toEqual([]);
    expect(mockTransaction(prepared).messages).toHaveLength(1);
    expect(firstMessage(prepared)).toMatchObject({
      type: '/vm.m_call',
      value: { caller: ACCOUNT, pkg_path: TWIN_GNS_PATH, func, args: [CAROL, '125000000'], send: '' },
    });
  } catch (error) {
    if (error instanceof Error) error.message += `\nprompt: ${prompt}\nturns: ${JSON.stringify([...prior, run].map(({ calls, results, text }) => ({ calls, results, text })))}`;
    throw error;
  }
}

describe.each([false, true])('duplicate GNS holdings (reverse=%s)', (reverse) => {
  let runner: ScenarioRunner;
  beforeAll(async () => {
    runner = await createEnvScenarioRunner(true, () => fakeReads(twinGnsHoldings(reverse)));
  });

  it('shows both holdings with their own balances and identities in the portfolio', async () => {
    const run = await runner.ask('Show me all my assets and balances.');
    expect(run.prepared).toEqual([]);
    expect(run.results).toContainEqual(expect.objectContaining({
      name: 'get_balance',
      output: expect.objectContaining({ kind: 'result', value: expect.objectContaining({
        status: 'complete', assets: expect.arrayContaining([
          expect.objectContaining({ assetId: GNS_PATH, symbol: 'GNS', amount: '12500000', decimals: 6 }),
          expect.objectContaining({ assetId: TWIN_GNS_PATH, symbol: 'GNS', amount: '300000000', decimals: 8 }),
        ]),
      }) }),
    }));
    expect(run.text).toContain(GNS_PATH);
    expect(run.text).toContain(TWIN_GNS_PATH);
    expect(run.text).toMatch(/12\.5\s*GNS/i);
    expect(run.text).toMatch(/3(?:\.0+)?\s*GNS/i);
  });

  it('distinguishes a symbol balance query from a qualified path query', async () => {
    const ambiguous = await runner.ask('What is my GNS balance?');
    expect(ambiguous.prepared).toEqual([]);
    expect(ambiguous.text).toContain(GNS_PATH);
    expect(ambiguous.text).toContain(TWIN_GNS_PATH);
    const selected = await runner.ask(`What is my balance for the token at ${TWIN_GNS_PATH}?`);
    expect(selected.prepared).toEqual([]);
    expect(selected.text).toMatch(/3(?:\.0+)?\s*GNS/i);
    expect(selected.text).not.toMatch(/12\.5\s*GNS/i);
  });

  it.each([
    ['transfer', 'Send 1 GNS to carol.'],
    ['approval', 'Approve carol to spend 1 GNS.'],
  ])('asks which realm for an ambiguous %s without a handoff', async (_kind, prompt) => {
    const run = await runner.ask(prompt);
    expect(run.prepared).toEqual([]);
    expect(run.text).toContain(GNS_PATH);
    expect(run.text).toContain(TWIN_GNS_PATH);
  });

  it.each([
    ['Transfer', `Send 1.25 of the token at ${TWIN_GNS_PATH} to carol.`],
    ['Approve', `Approve carol to spend 1.25 of the token at ${TWIN_GNS_PATH}.`],
  ] as const)('prepares an explicit B %s using B precision', async (func, prompt) => {
    expectUnsignedB(await runner.ask(prompt), func, prompt);
  });

  it('does not substitute the better-funded A when B is insufficient', async () => {
    const run = await runner.ask(`Send 4 of the token at ${TWIN_GNS_PATH} to carol.`);
    expect(run.prepared).toEqual([]);
    expect(run.text).toMatch(/insufficient|not enough|too low|exceeds|only\s+3/i);
  });

  it.each([
    `Send 1 of the token at ${TWIN_GNS_PATH}.`,
    `Approve 1 of the token at ${TWIN_GNS_PATH}.`,
  ])('asks for the missing recipient or spender: %s', async (prompt) => {
    const run = await runner.ask(prompt);
    expect(run.prepared).toEqual([]);
    expect(run.text).toMatch(/who|whom|recipient|spender|address|누구|받는|주소/i);
  });

  it('uses the explicitly selected B on a follow-up to an ambiguous request', async () => {
    const [initial, selected] = await runner.chat([
      'Send 1.25 GNS to carol.',
      TWIN_GNS_PATH,
    ]);
    expect(initial.prepared).toEqual([]);
    expect(initial.text).toContain(GNS_PATH);
    expect(initial.text).toContain(TWIN_GNS_PATH);
    expectUnsignedB(selected, 'Transfer', `Send 1.25 GNS to carol. Then use ${TWIN_GNS_PATH}.`, [initial]);
  });
});
