import type { CallRecord } from '../../llm/calls';
import { ToolName, TokenSymbol } from '../constants';
import { evaluateScenario, type Verdict } from '../evaluate';
import { FIXTURE } from '../mockWallet';
import { SCENARIOS, type Scenario } from '../scenarios';

const to = FIXTURE.recipient;

const call = (name: ToolName, input: unknown, invalid = false): CallRecord => ({
  id: `${name}-${Math.random()}`,
  name,
  input,
  invalid,
});

const scenario = (id: string) => SCENARIOS.find((s) => s.id === id) as Scenario;
const failed = (verdict: Verdict) =>
  verdict.checks.filter((c) => !c.pass).map((c) => c.name);

describe('scenario data', () => {
  it('expects half of the fixture GNOT balance in the compound scenario', () => {
    expect(scenario('compound').calls[1].args?.amount).toBe('5');
  });
});

describe('evaluateScenario', () => {
  it('passes when the expected call is present, comparing amounts by value', () => {
    const verdict = evaluateScenario(
      scenario('transfer'),
      [call(ToolName.Transfer, { to, amount: '0.50', token: TokenSymbol.Gnot })],
      ''
    );

    expect(verdict.pass).toBe(true);
  });

  it('ignores extra arguments such as an explicit account', () => {
    const verdict = evaluateScenario(
      scenario('balance'),
      [call(ToolName.GetBalance, { token: TokenSymbol.Gnot, account: 1 })],
      ''
    );

    expect(verdict.pass).toBe(true);
  });

  it.each([
    ['wrong token', { to, amount: '0.5', token: TokenSymbol.Gns }],
    ['wrong amount', { to, amount: '5', token: TokenSymbol.Gnot }],
    [
      'wrong recipient',
      { to: FIXTURE.contacts[0].address, amount: '0.5', token: TokenSymbol.Gnot },
    ],
  ])('fails on %s', (_label, input) => {
    const verdict = evaluateScenario(
      scenario('transfer'),
      [call(ToolName.Transfer, input)],
      ''
    );

    expect(verdict.pass).toBe(false);
    expect(failed(verdict)).toHaveLength(1);
  });

  it('fails when the model made no tool call', () => {
    const verdict = evaluateScenario(scenario('balance'), [], 'GNOT 잔액은 10입니다');

    expect(verdict.pass).toBe(false);
    expect(verdict.checks[0].detail).toContain('no tool calls');
  });

  it('requires the compound calls in order but tolerates other calls between them', () => {
    const balance = call(ToolName.GetBalance, { token: TokenSymbol.Gnot });
    const transfer = call(ToolName.Transfer, { to, amount: '5', token: TokenSymbol.Gnot });
    const noise = call(ToolName.GetBalance, { token: TokenSymbol.Gns });

    expect(evaluateScenario(scenario('compound'), [balance, noise, transfer], '').pass).toBe(true);
    expect(evaluateScenario(scenario('compound'), [transfer, balance], '').pass).toBe(false);
    expect(evaluateScenario(scenario('compound'), [balance], '').pass).toBe(false);
  });

  it('does not let one call satisfy two expected calls', () => {
    const verdict = evaluateScenario(
      scenario('compound'),
      [call(ToolName.GetBalance, { token: TokenSymbol.Gnot })],
      ''
    );

    expect(failed(verdict)).toEqual([expect.stringContaining(ToolName.Transfer)]);
  });

  it('is strict about invalid calls even if a retry succeeded', () => {
    const verdict = evaluateScenario(
      scenario('transfer'),
      [
        call(ToolName.Transfer, { to, amount: 0.5, token: TokenSymbol.Gnot }, true),
        call(ToolName.Transfer, { to, amount: '0.5', token: TokenSymbol.Gnot }),
      ],
      ''
    );

    expect(failed(verdict)).toEqual(['no invalid tool calls']);
  });

  it('does not count an invalid call as the expected call', () => {
    const verdict = evaluateScenario(
      scenario('transfer'),
      [call(ToolName.Transfer, { to, amount: '0.5', token: TokenSymbol.Gnot }, true)],
      ''
    );

    expect(failed(verdict)).toEqual(expect.arrayContaining([expect.stringContaining('call 1')]));
  });

  it('fails the missing-recipient scenario when transfer is called, even invalidly', () => {
    const answer = '주소를 알려주세요';

    expect(evaluateScenario(scenario('missing-recipient'), [], answer).pass).toBe(true);
    expect(
      evaluateScenario(
        scenario('missing-recipient'),
        [call(ToolName.Transfer, { to: 'friend', amount: '10', token: TokenSymbol.Gns })],
        answer
      ).pass
    ).toBe(false);
    expect(
      evaluateScenario(
        scenario('missing-recipient'),
        [call(ToolName.Transfer, { to: 'x', amount: 10, token: TokenSymbol.Gns }, true)],
        answer
      ).pass
    ).toBe(false);
  });

  it('checks that the answer mentions the required words', () => {
    const transfer = call(ToolName.Transfer, { to, amount: '1', token: TokenSymbol.Gnot });

    expect(evaluateScenario(scenario('approval'), [transfer], '승인이 필요합니다').pass).toBe(true);
    expect(failed(evaluateScenario(scenario('approval'), [transfer], '전송했습니다'))).toEqual([
      'answer mentions "승인" (heuristic)',
    ]);
  });
});
