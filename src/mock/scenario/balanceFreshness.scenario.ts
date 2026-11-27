import { fakeOnblocMcp } from '../../harness/mcp/testing/fakeOnblocMcp';
import { ACCOUNT, createEnvScenarioRunner } from './harness';

jest.setTimeout(5 * 60_000);

// Change the provider response, not the conversation: a stale answer cannot pass by coincidence.
it('refreshes a verified empty wallet after its native balance changes', async () => {
  const reads = fakeOnblocMcp([
    { name: 'get_native_balance', get output() {
      const firstRead = reads.calls.filter(call => call.name === 'get_native_balance').length === 1;
      return { address: ACCOUNT, denom: 'ugnot', balance: firstRead ? '0' : '4250000' };
    } },
    { name: 'get_token_balances', output: { address: ACCOUNT, items: [] } },
  ]);
  const runner = await createEnvScenarioRunner(false, () => reads);
  const [portfolio, followUp] = await runner.chat(['Show me all my assets.', 'What about GNOT?']);
  expect(portfolio.text).toContain('0 GNOT');
  expect(portfolio.text).toMatch(/no token balances/i);
  expect(followUp.text).toContain('4.25 GNOT');
  expect([...portfolio.prepared, ...followUp.prepared]).toEqual([]);
});

it('keeps the verified native balance without declaring a partial portfolio empty', async () => {
  const runner = await createEnvScenarioRunner(false, () => fakeOnblocMcp([
    { name: 'get_native_balance', output: { address: ACCOUNT, denom: 'ugnot', balance: '3000000' } },
    { name: 'get_token_balances', isError: true, content: [{ type: 'text', text: 'provider unavailable' }] },
  ]));
  const turn = await runner.ask('Show me all my assets.');
  expect(turn.text).toContain('3 GNOT');
  expect(turn.text).toMatch(/could not verify: token balances/i);
  expect(turn.text).not.toMatch(/no token balances/i);
  expect(turn.prepared).toEqual([]);
});
