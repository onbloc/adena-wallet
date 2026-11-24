// Runs scenarios or one prompt many times and reports how often the agent prepares exactly the
// expected transaction. Judged on the summaries alone (what the model chose). Portable: it needs
// only a ScenarioRunner, so it runs in the app on a phone and in a CLI.
import { checkSummaries, describeSummaries, type Verdict } from './check';
import type { ScenarioRunner } from './runner';
import type { Scenario } from './scenarios';

export type BenchmarkTarget =
  | { kind: 'scenarios'; scenarios: readonly Scenario[] }
  | { kind: 'prompt'; prompt: string };

type ItemStats = { name: string; prompt: string; runs: number; passed: number; reasons: { text: string; count: number }[] };

export type BenchmarkReport = {
  target: BenchmarkTarget['kind'];
  runsPerItem: number;
  planned: number;
  completed: number;
  aborted: boolean;
  totalMs: number;
  /** Scenarios: runs that prepared the expected transaction. Prompt: runs of the most common outcome. */
  passed: number;
  /** Runs that ended in an error. */
  errored: number;
  /** Scenarios only. */
  items: ItemStats[];
  /** Prompt only: what each run prepared, most common first. */
  outcomes: { text: string; count: number }[];
  errors: { code: string; count: number }[];
  timing: { meanMs: number; p50Ms: number; p95Ms: number; maxMs: number };
  /** Mean run time of the first and the second half of the runs: a rise hints at thermal throttling. */
  halves?: { firstMs: number; secondMs: number };
};

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`;
const percent = (part: number, whole: number) => (whole === 0 ? '-' : `${((part / whole) * 100).toFixed(1)}%`);
const clip = (text: string, max = 160) => (text.length > max ? `${text.slice(0, max)}...` : text);

const mean = (values: readonly number[]) => (values.length === 0 ? 0 : values.reduce((sum, v) => sum + v, 0) / values.length);

/** Nearest rank on an ascending list. */
const percentile = (sorted: readonly number[], p: number) =>
  sorted.length === 0 ? 0 : sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))];

const bump = (counts: Map<string, number>, key: string) => counts.set(key, (counts.get(key) ?? 0) + 1);
const ranked = (counts: Map<string, number>) =>
  [...counts].map(([text, count]) => ({ text, count })).sort((a, b) => b.count - a.count || a.text.localeCompare(b.text));

/** The code of an `ADENA_*` error, else the error's name. */
function describeError(error: unknown): { code: string; text: string } {
  const message = error instanceof Error ? error.message : String(error);
  const firstLine = message.split('\n')[0];
  const code = /^(ADENA_[A-Z_]+)/.exec(firstLine)?.[1] ?? (error instanceof Error ? error.name : 'Error');
  return { code, text: clip(firstLine) };
}

type RunRecord = { ms: number; error?: string; outcome?: string; verdict?: Verdict };

export async function runBenchmark({
  runner,
  target,
  runs,
  signal,
  onLog,
  header = [],
  preflight,
  now = Date.now,
}: {
  runner: ScenarioRunner;
  target: BenchmarkTarget;
  /** How many times each scenario (or the prompt) runs. */
  runs: number;
  signal?: AbortSignal;
  /** Gets every log line as it happens. */
  onLog: (line: string) => void;
  /** Lines describing the conditions (device, model, settings), logged first. */
  header?: readonly string[];
  /** Checks what the runs depend on; a throw stops the benchmark before the first run. */
  preflight?: () => Promise<string>;
  now?: () => number;
}): Promise<BenchmarkReport> {
  if (!Number.isSafeInteger(runs) || runs < 1) throw new RangeError('Runs must be a positive integer.');
  const items: { name: string; prompt: string; scenario?: Scenario }[] =
    target.kind === 'scenarios'
      ? target.scenarios.map((scenario) => ({ name: scenario.name, prompt: scenario.prompt, scenario }))
      : [{ name: 'prompt', prompt: target.prompt.trim() }];
  if (items.length === 0 || items.some((item) => item.prompt === '')) throw new TypeError('Nothing to run: a prompt is empty.');

  const planned = items.length * runs;
  const width = String(planned).length;
  for (const line of header) onLog(line);
  onLog(
    target.kind === 'scenarios'
      ? `Benchmark: ${items.length} scenarios x ${runs} runs = ${planned} runs`
      : `Benchmark: 1 prompt x ${runs} runs`
  );
  if (preflight) {
    try {
      onLog(`preflight: ${await preflight()}`);
    } catch (error) {
      onLog(`preflight failed: ${describeError(error).text}`);
      throw error;
    }
  }
  if (target.kind === 'prompt') onLog(`prompt: ${JSON.stringify(items[0].prompt)}`);

  const startedAt = now();
  const records: RunRecord[] = [];
  const stats: ItemStats[] = items.map(({ name, prompt }) => ({ name, prompt, runs: 0, passed: 0, reasons: [] }));
  const reasons = items.map(() => new Map<string, number>());
  const outcomes = new Map<string, number>();
  const errors = new Map<string, number>();
  let aborted = false;
  let roundPassed = 0;

  rounds: for (let round = 1; round <= runs; round++) {
    roundPassed = 0;
    for (let i = 0; i < items.length; i++) {
      if (signal?.aborted) { aborted = true; break rounds; }
      const { name, prompt, scenario } = items[i];
      const runStarted = now();
      const record: RunRecord = { ms: 0 };
      try {
        const result = await runner.ask(prompt, signal);
        if (signal?.aborted) { aborted = true; break rounds; }
        const summaries = result.prepared.map((prepared) => prepared.summary);
        record.outcome = describeSummaries(summaries);
        if (scenario) record.verdict = checkSummaries(summaries, scenario.expected);
      } catch (error) {
        if (signal?.aborted) { aborted = true; break rounds; }
        const { code, text } = describeError(error);
        record.error = text.startsWith(code) ? text : `${code}: ${text}`;
        bump(errors, code);
      }
      record.ms = now() - runStarted;
      records.push(record);

      const index = String(records.length).padStart(width, '0');
      const tag = `[${index}/${planned}]`;
      stats[i].runs++;
      if (scenario) {
        const ok = record.error === undefined && record.verdict?.ok === true;
        if (ok) { stats[i].passed++; roundPassed++; }
        const reason = record.error ?? (record.verdict && !record.verdict.ok ? record.verdict.reason : undefined);
        if (reason !== undefined) bump(reasons[i], clip(reason));
        onLog(ok ? `${tag} PASS ${name}  ${seconds(record.ms)}` : `${tag} FAIL ${name}  ${seconds(record.ms)}  - ${clip(reason ?? 'unknown')}`);
      } else if (record.error !== undefined) {
        onLog(`${tag} ERROR  ${seconds(record.ms)}  - ${record.error}`);
      } else {
        const outcome = record.outcome ?? '';
        const isNew = !outcomes.has(outcome);
        bump(outcomes, outcome);
        onLog(`${tag} ${outcome}  ${seconds(record.ms)}${isNew ? '  (new outcome)' : ''}`);
      }
    }
    if (target.kind === 'scenarios') {
      onLog(`round ${round}/${runs}: ${roundPassed}/${items.length} passed, ${seconds(now() - startedAt)} elapsed`);
    }
  }

  const times = records.map((record) => record.ms);
  const sorted = [...times].sort((a, b) => a - b);
  const outcomeList = ranked(outcomes);
  const half = Math.floor(times.length / 2);
  const passed = target.kind === 'scenarios' ? stats.reduce((sum, item) => sum + item.passed, 0) : (outcomeList[0]?.count ?? 0);
  const report: BenchmarkReport = {
    target: target.kind,
    runsPerItem: runs,
    planned,
    completed: records.length,
    aborted,
    totalMs: now() - startedAt,
    passed,
    errored: records.filter((record) => record.error !== undefined).length,
    items: stats.map((item, i) => ({ ...item, reasons: ranked(reasons[i]) })),
    outcomes: outcomeList,
    errors: ranked(errors).map(({ text, count }) => ({ code: text, count })),
    timing: { meanMs: mean(times), p50Ms: percentile(sorted, 50), p95Ms: percentile(sorted, 95), maxMs: sorted.at(-1) ?? 0 },
    ...(times.length >= 4 && { halves: { firstMs: mean(times.slice(0, half)), secondMs: mean(times.slice(times.length - half)) } }),
  };
  for (const line of formatReport(report)) onLog(line);
  return report;
}

/** The result as text lines: what to read first, then per scenario or per outcome, then errors. */
export function formatReport(report: BenchmarkReport): string[] {
  const lines = ['', '=== Benchmark result ==='];
  lines.push(`runs: ${report.completed}/${report.planned} completed${report.aborted ? ' (stopped early)' : ''} in ${seconds(report.totalMs)}`);

  if (report.target === 'scenarios') {
    lines.push(`passed: ${report.passed}/${report.completed} (${percent(report.passed, report.completed)})`);
  } else {
    const distinct = report.outcomes.length;
    const consistent = distinct === 1 && report.errored === 0 && report.completed > 0;
    lines.push(`consistent: ${consistent ? 'yes' : 'NO'} - ${distinct} distinct outcome(s), ${report.errored} error(s)`);
  }
  lines.push(
    `time per run: mean ${seconds(report.timing.meanMs)}, p50 ${seconds(report.timing.p50Ms)}, p95 ${seconds(report.timing.p95Ms)}, max ${seconds(report.timing.maxMs)}`
  );
  if (report.halves) {
    const { firstMs, secondMs } = report.halves;
    const change = firstMs === 0 ? 0 : ((secondMs - firstMs) / firstMs) * 100;
    lines.push(`first half ${seconds(firstMs)} -> second half ${seconds(secondMs)} (${change >= 0 ? '+' : ''}${change.toFixed(0)}%)`);
  }

  if (report.target === 'scenarios') {
    lines.push('', '-- per scenario (passed/runs) --');
    for (const item of report.items) {
      lines.push(`${String(item.passed).padStart(3)}/${item.runs}  ${item.name}`);
      for (const reason of item.reasons) lines.push(`         ${reason.count}x ${reason.text}`);
    }
  } else {
    lines.push('', '-- outcomes (most common first) --');
    for (const outcome of report.outcomes) lines.push(`${String(outcome.count).padStart(3)}/${report.completed}  ${outcome.text}`);
  }
  if (report.errors.length > 0) {
    lines.push('', '-- errors --');
    for (const error of report.errors) lines.push(`${error.count}x ${error.code}`);
  }
  return lines;
}
