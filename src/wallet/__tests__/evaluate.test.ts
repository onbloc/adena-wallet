import type { CallRecord } from '../../llm/calls';
import { evaluateScenario, type Verdict } from '../evaluate';
import { FIXTURE } from '../mockWallet';
import { SCENARIOS, type Scenario } from '../scenarios';

const to = FIXTURE.recipient;

const call = (name: string, input: unknown, invalid = false): CallRecord => ({
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
      [call('transfer', { to, amount: '0.50', token: 'GNOT' })],
      ''
    );

    expect(verdict.pass).toBe(true);
  });

  it('ignores extra arguments such as an explicit account', () => {
    const verdict = evaluateScenario(
      scenario('balance'),
      [call('get_balance', { token: 'GNOT', account: 1 })],
      ''
    );

    expect(verdict.pass).toBe(true);
  });

  it.each([
    ['wrong token', { to, amount: '0.5', token: 'GNS' }],
    ['wrong amount', { to, amount: '5', token: 'GNOT' }],
    ['wrong recipient', { to: FIXTURE.contacts[0].address, amount: '0.5', token: 'GNOT' }],
  ])('fails on %s', (_label, input) => {
    const verdict = evaluateScenario(scenario('transfer'), [call('transfer', input)], '');

    expect(verdict.pass).toBe(false);
    expect(failed(verdict)).toHaveLength(1);
  });

  it('fails when the model made no tool call', () => {
    const verdict = evaluateScenario(scenario('balance'), [], 'GNOT 잔액은 10입니다');

    expect(verdict.pass).toBe(false);
    expect(verdict.checks[0].detail).toContain('no tool calls');
  });

  it('requires the compound calls in order but tolerates other calls between them', () => {
    const balance = call('get_balance', { token: 'GNOT' });
    const transfer = call('transfer', { to, amount: '5', token: 'GNOT' });
    const noise = call('get_balance', { token: 'GNS' });

    expect(evaluateScenario(scenario('compound'), [balance, noise, transfer], '').pass).toBe(true);
    expect(evaluateScenario(scenario('compound'), [transfer, balance], '').pass).toBe(false);
    expect(evaluateScenario(scenario('compound'), [balance], '').pass).toBe(false);
  });

  it('does not let one call satisfy two expected calls', () => {
    const verdict = evaluateScenario(
      scenario('compound'),
      [call('get_balance', { token: 'GNOT' })],
      ''
    );

    expect(failed(verdict)).toEqual([expect.stringContaining('transfer')]);
  });

  it('is strict about invalid calls even if a retry succeeded', () => {
    const verdict = evaluateScenario(
      scenario('transfer'),
      [
        call('transfer', { to, amount: 0.5, token: 'GNOT' }, true),
        call('transfer', { to, amount: '0.5', token: 'GNOT' }),
      ],
      ''
    );

    expect(failed(verdict)).toEqual(['no invalid tool calls']);
  });

  it('does not count an invalid call as the expected call', () => {
    const verdict = evaluateScenario(
      scenario('transfer'),
      [call('transfer', { to, amount: '0.5', token: 'GNOT' }, true)],
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
        [call('transfer', { to: 'friend', amount: '10', token: 'GNS' })],
        answer
      ).pass
    ).toBe(false);
    expect(
      evaluateScenario(
        scenario('missing-recipient'),
        [call('transfer', { to: 'x', amount: 10, token: 'GNS' }, true)],
        answer
      ).pass
    ).toBe(false);
  });

  it('checks that the answer mentions the required words', () => {
    const transfer = call('transfer', { to, amount: '1', token: 'GNOT' });

    expect(evaluateScenario(scenario('approval'), [transfer], '승인이 필요합니다').pass).toBe(true);
    expect(failed(evaluateScenario(scenario('approval'), [transfer], '전송했습니다'))).toEqual([
      'answer mentions "승인" (heuristic)',
    ]);
  });
});
