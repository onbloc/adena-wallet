import type { CallRecord } from '../../llm/calls';
import { ToolName } from '../constants';
import { summarize, type RunResult } from '../evalReport';
import { SCENARIOS } from '../scenarios';

const invalidCall: CallRecord = { id: 'x', name: ToolName.Transfer, input: {}, invalid: true };

const run = (scenarioId: string, overrides: Partial<RunResult> = {}): RunResult => ({
  scenarioId,
  pass: true,
  failedChecks: [],
  calls: [],
  text: '',
  totalMs: 100,
  ...overrides,
});

describe('summarize', () => {
  it('counts passes and runs per scenario, in scenario order, skipping scenarios with no runs', () => {
    const rows = summarize(
      [
        run('transfer'),
        run('balance'),
        run('transfer', { pass: false, failedChecks: ['call 1'] }),
      ],
      SCENARIOS
    );

    expect(rows.map((r) => [r.id, r.passes, r.runs])).toEqual([
      ['balance', 1, 1],
      ['transfer', 1, 2],
    ]);
  });

  it('counts runs (not calls) that had an invalid call', () => {
    const rows = summarize(
      [
        run('balance', { calls: [invalidCall, invalidCall] }),
        run('balance'),
      ],
      SCENARIOS
    );

    expect(rows[0].invalidRuns).toBe(1);
  });

  it('ranks the most frequent failed checks first and keeps only the top three', () => {
    const fail = (...failedChecks: string[]) => run('sign', { pass: false, failedChecks });
    const rows = summarize(
      [
        fail('a'),
        fail('a', 'b'),
        fail('a', 'b', 'c'),
        fail('d'),
      ],
      SCENARIOS
    );

    expect(rows[0].topFailures).toEqual([
      { name: 'a', count: 3 },
      { name: 'b', count: 2 },
      expect.objectContaining({ count: 1 }),
    ]);
  });

  it('averages only runs that finished and reports null when none did', () => {
    const mixed = summarize(
      [run('sign', { totalMs: 100 }), run('sign', { totalMs: 300 }), run('sign', { totalMs: null })],
      SCENARIOS
    );
    const none = summarize([run('sign', { totalMs: null })], SCENARIOS);

    expect(mixed[0].avgMs).toBe(200);
    expect(none[0].avgMs).toBeNull();
  });
});
