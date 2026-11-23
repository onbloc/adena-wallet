import type { CallRecord } from '../llm/calls';
import type { Scenario } from './scenarios';

/** Outcome of one scenario run against a model. */
export type RunResult = {
  scenarioId: string;
  pass: boolean;
  /** Names of the failed checks; ['run error'] when the run threw. */
  failedChecks: string[];
  calls: CallRecord[];
  text: string;
  totalMs: number | null;
  outputTokens?: number;
  error?: string;
};

export type ScenarioSummary = {
  id: string;
  title: string;
  runs: number;
  passes: number;
  /** Runs with at least one invalid tool call. */
  invalidRuns: number;
  /** Mean total time over runs that finished; null if none did. */
  avgMs: number | null;
  topFailures: { name: string; count: number }[];
};

const TOP_FAILURES = 3;

/** One row per scenario that has runs, in scenario order. */
export function summarize(results: RunResult[], scenarios: Scenario[]): ScenarioSummary[] {
  return scenarios.flatMap((scenario) => {
    const runs = results.filter((result) => result.scenarioId === scenario.id);
    if (runs.length === 0) return [];

    const failures = new Map<string, number>();
    for (const run of runs) {
      for (const name of run.failedChecks) failures.set(name, (failures.get(name) ?? 0) + 1);
    }
    const times = runs.flatMap((run) => (run.totalMs === null ? [] : [run.totalMs]));

    return [
      {
        id: scenario.id,
        title: scenario.title,
        runs: runs.length,
        passes: runs.filter((run) => run.pass).length,
        invalidRuns: runs.filter((run) => run.calls.some((call) => call.invalid)).length,
        avgMs: times.length === 0 ? null : times.reduce((a, b) => a + b, 0) / times.length,
        topFailures: [...failures]
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, TOP_FAILURES),
      },
    ];
  });
}

/** Plain-text table plus the most common failure reasons per scenario. */
export function formatReport(summaries: ScenarioSummary[]): string {
  const header = ['scenario', 'pass', 'rate', 'invalid runs', 'avg ms'];
  const rows = summaries.map((s) => [
    s.id,
    `${s.passes}/${s.runs}`,
    `${Math.round((s.passes / s.runs) * 100)}%`,
    String(s.invalidRuns),
    s.avgMs === null ? '-' : String(Math.round(s.avgMs)),
  ]);
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
  const line = (cells: string[]) => cells.map((c, i) => c.padEnd(widths[i])).join('  ');

  const passes = summaries.reduce((sum, s) => sum + s.passes, 0);
  const runs = summaries.reduce((sum, s) => sum + s.runs, 0);
  const failures = summaries
    .filter((s) => s.topFailures.length > 0)
    .flatMap((s) => [`${s.id}:`, ...s.topFailures.map((f) => `  ${f.count}x ${f.name}`)]);

  return [
    line(header),
    ...rows.map(line),
    '',
    `total: ${passes}/${runs}`,
    ...(failures.length > 0 ? ['', 'failed checks:', ...failures] : []),
  ].join('\n');
}
