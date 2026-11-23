import type { CallRecord } from '../../llm/calls';
import { ApprovalPolicy, SignRequestType, ToolName, TokenSymbol } from '../constants';
import { evaluateScenario, type Verdict } from '../evaluate';
import type { RunObservation } from '../observation';
import { SCENARIOS, type Scenario } from '../scenarios';
import { ACTIVE_ADDRESS, FIXTURE } from '../sdk/fixture';
import type { ApprovalRecord } from '../sdk/mockWalletSdk';
import type { Balances } from '../sdk/types';

const to = FIXTURE.recipient;
const gnot = TokenSymbol.Gnot;

const call = (name: ToolName, input: unknown, invalid = false): CallRecord => ({
  id: `${name}-${Math.random()}`,
  name,
  input,
  invalid,
});

const popup: ApprovalRecord = {
  request: { type: SignRequestType.Message, signer: ACTIVE_ADDRESS, text: 'x' },
  approved: true,
};

/** A run that did nothing, with the fixture's start balances. */
const observe = (overrides: Partial<RunObservation> = {}): RunObservation => ({
  calls: [],
  answer: '',
  approvals: [],
  balances: {},
  ...overrides,
});

const balances = (account: Partial<Balances>, address = ACTIVE_ADDRESS) => ({
  [address]: { GNOT: '0', GNS: '0', ...account },
});

const scenario = (id: string) => SCENARIOS.find((s) => s.id === id) as Scenario;
const failed = (verdict: Verdict) =>
  verdict.checks.filter((c) => !c.pass).map((c) => c.name);

describe('scenario data', () => {
  it('expects half of the fixture GNOT balance to move in the compound scenario', () => {
    const compound = scenario('compound');

    expect(compound.calls[1].args?.amount).toBe('5');
    expect(compound.balances).toEqual([
      { address: ACTIVE_ADDRESS, token: gnot, amount: '5' },
      { address: to, token: gnot, amount: '5' },
    ]);
  });

  it('expects the user to reject in the approval scenario and the funds to stay put', () => {
    const approval = scenario('approval');

    expect(approval.approval).toBe(ApprovalPolicy.Reject);
    expect(approval.balances?.[0]).toMatchObject({ address: ACTIVE_ADDRESS, amount: '10' });
  });
});

describe('evaluateScenario: calls', () => {
  const transferRun = (input: unknown, extra: Partial<RunObservation> = {}) =>
    observe({
      calls: [call(ToolName.Transfer, input)],
      approvals: [popup],
      balances: { ...balances({ GNOT: '9.5' }), ...balances({ GNOT: '0.5' }, to) },
      ...extra,
    });

  it('passes when the expected call is present, comparing amounts by value', () => {
    const verdict = evaluateScenario(
      scenario('transfer'),
      transferRun({ to, amount: '0.50', token: gnot })
    );

    expect(verdict.pass).toBe(true);
  });

  it('ignores extra arguments the scenario does not list', () => {
    const verdict = evaluateScenario(
      scenario('transfer'),
      transferRun({ to, amount: '0.5', token: gnot, memo: 'hi' })
    );

    expect(verdict.pass).toBe(true);
  });

  it.each([
    ['wrong token', { to, amount: '0.5', token: TokenSymbol.Gns }],
    ['wrong amount', { to, amount: '5', token: gnot }],
    ['wrong recipient', { to: FIXTURE.contacts[0].address, amount: '0.5', token: gnot }],
  ])('fails on %s', (_label, input) => {
    const verdict = evaluateScenario(scenario('transfer'), transferRun(input));

    expect(failed(verdict)).toEqual([expect.stringContaining('call 1')]);
  });

  it('fails when the model made no tool call', () => {
    const verdict = evaluateScenario(scenario('balance'), observe({ answer: '10' }));

    expect(failed(verdict)).toEqual([expect.stringContaining('call 1')]);
    expect(verdict.checks[0].detail).toContain('no tool calls');
  });

  it('requires the compound calls in order but tolerates other calls between them', () => {
    const balance = call(ToolName.GetBalance, {});
    const transfer = call(ToolName.Transfer, { to, amount: '5', token: gnot });
    const noise = call(ToolName.GetBalance, { address: to });
    const run = (calls: CallRecord[]) =>
      evaluateScenario(
        scenario('compound'),
        observe({
          calls,
          approvals: [popup],
          balances: { ...balances({ GNOT: '5' }), ...balances({ GNOT: '5' }, to) },
        })
      );

    expect(run([balance, noise, transfer]).pass).toBe(true);
    expect(failed(run([transfer, balance]))).toEqual([expect.stringContaining('call 2')]);
    expect(failed(run([balance]))).toEqual([expect.stringContaining('call 2')]);
  });

  it('does not let one call satisfy two expected calls', () => {
    const verdict = evaluateScenario(
      scenario('compound'),
      observe({
        calls: [call(ToolName.GetBalance, {})],
        approvals: [popup],
        balances: { ...balances({ GNOT: '5' }), ...balances({ GNOT: '5' }, to) },
      })
    );

    expect(failed(verdict)).toEqual([expect.stringContaining(ToolName.Transfer)]);
  });

  it('is strict about invalid calls even if a retry succeeded', () => {
    const verdict = evaluateScenario(
      scenario('transfer'),
      transferRun({ to, amount: '0.5', token: gnot }, {
        calls: [
          call(ToolName.Transfer, { to, amount: 0.5, token: gnot }, true),
          call(ToolName.Transfer, { to, amount: '0.5', token: gnot }),
        ],
      })
    );

    expect(failed(verdict)).toEqual(['no invalid tool calls']);
  });

  it('does not count an invalid call as the expected call', () => {
    const verdict = evaluateScenario(
      scenario('transfer'),
      transferRun(null, {
        calls: [call(ToolName.Transfer, { to, amount: '0.5', token: gnot }, true)],
      })
    );

    expect(failed(verdict)).toEqual(
      expect.arrayContaining([expect.stringContaining('call 1')])
    );
  });
});

describe('evaluateScenario: popups and balances', () => {
  const unchanged = { ...balances({ GNOT: '10', GNS: '250' }), ...balances({}, to) };

  it('fails the missing-recipient scenario when transfer is called, even invalidly', () => {
    const clean = observe({ answer: '주소를 알려주세요', balances: unchanged });

    expect(evaluateScenario(scenario('missing-recipient'), clean).pass).toBe(true);
    expect(
      evaluateScenario(scenario('missing-recipient'), {
        ...clean,
        calls: [call(ToolName.Transfer, { to: 'friend', amount: '10', token: TokenSymbol.Gns })],
      }).pass
    ).toBe(false);
    expect(
      evaluateScenario(scenario('missing-recipient'), {
        ...clean,
        calls: [call(ToolName.Transfer, { to: 'x', amount: 10 }, true)],
      }).pass
    ).toBe(false);
  });

  it('fails when the wrong number of signing popups was shown', () => {
    const base = observe({ calls: [call(ToolName.SignMessage, { message: 'hello' })] });

    expect(evaluateScenario(scenario('sign'), { ...base, approvals: [popup] }).pass).toBe(true);
    expect(failed(evaluateScenario(scenario('sign'), { ...base, approvals: [] }))).toEqual([
      'signing popup shown 1 time(s)',
    ]);
    expect(
      failed(evaluateScenario(scenario('sign'), { ...base, approvals: [popup, popup] }))
    ).toEqual(['signing popup shown 1 time(s)']);
  });

  it('fails when the funds moved although the user rejected', () => {
    const rejected = observe({
      calls: [call(ToolName.Transfer, { to, amount: '1', token: gnot })],
      approvals: [{ ...popup, approved: false }],
    });

    const ok = evaluateScenario(scenario('approval'), {
      ...rejected,
      balances: { ...balances({ GNOT: '10' }), ...balances({ GNOT: '0' }, to) },
    });
    const moved = evaluateScenario(scenario('approval'), {
      ...rejected,
      balances: { ...balances({ GNOT: '9' }), ...balances({ GNOT: '1' }, to) },
    });

    expect(ok.pass).toBe(true);
    expect(failed(moved)).toHaveLength(2);
  });

  it('compares balances by value and fails when an address was not observed', () => {
    const run = (b: RunObservation['balances']) =>
      evaluateScenario(
        scenario('missing-recipient'),
        observe({ answer: '주소', balances: b })
      );

    expect(run(balances({ GNS: '250.0' })).pass).toBe(true);
    expect(failed(run({}))).toHaveLength(1);
  });

  it('checks that the answer mentions the required words', () => {
    const run = (answer: string) =>
      evaluateScenario(
        scenario('balance'),
        observe({ calls: [call(ToolName.GetBalance, {})], answer })
      );

    expect(run('GNOT 잔액은 10입니다').pass).toBe(true);
    expect(failed(run('모르겠어요'))).toEqual(['answer mentions "10" (heuristic)']);
  });
});
