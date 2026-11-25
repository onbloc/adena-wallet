// Runs scenarios or one prompt many times and reports how often the agent prepares exactly the
// expected transaction. Judged on the summaries alone (what the model chose). Portable: it needs
// only a ScenarioRunner, so it runs in the app on a phone and in a CLI.
import { checkRun, describeSummaries, explainNothing, judgeToolCalling, type ToolCalling, type Verdict } from './check';
import type { ScenarioRunner } from './runner';
import type { Scenario } from './scenarios';
import type { Stage, StageLabel } from './timing';

export type BenchmarkTarget =
  | { kind: 'scenarios'; scenarios: readonly Scenario[] }
  | { kind: 'prompt'; prompt: string };

type ItemStats = { name: string; prompt: string; runs: number; passed: number; reasons: { text: string; count: number }[] };

type StageStats = { label: StageLabel; count: number; meanMs: number; p50Ms: number; p95Ms: number; meanTokens?: number };

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
  /** Time per model call, in the order the calls come in a run. */
  stages: StageStats[];
  /** Mean time per run outside the model calls (wallet, MCP reads, JavaScript). */
  outsideModelMs?: number;
  /** Scenarios only: how often the right tool was chosen, and its arguments filled right. */
  toolCalling?: { tool: Rate; args: Rate };
};

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`;
const percent = (part: number, whole: number) => (whole === 0 ? '-' : `${((part / whole) * 100).toFixed(1)}%`);

/** Runs that got something right out of the runs that could. */
type Rate = { hit: number; total: number };

/** The 95% Wilson score interval of a hit rate, in percent. */
function wilson({ hit, total }: Rate): { low: number; high: number } {
  if (total === 0) return { low: 0, high: 0 };
  const z2 = 1.96 ** 2;
  const p = hit / total;
  const centre = (p + z2 / (2 * total)) / (1 + z2 / total);
  const half = (1.96 * Math.sqrt((p * (1 - p)) / total + z2 / (4 * total * total))) / (1 + z2 / total);
  return { low: Math.max(0, centre - half) * 100, high: Math.min(1, centre + half) * 100 };
}

/** `87/100 (87.0%, 95% CI 79.0-92.5%)`. */
function rateText(rate: Rate): string {
  if (rate.total === 0) return '0/0 (N/A)';
  const { low, high } = wilson(rate);
  return `${rate.hit}/${rate.total} (${percent(rate.hit, rate.total)}, 95% CI ${low.toFixed(1)}-${high.toFixed(1)}%)`;
}

const clip = (text: string, max = 160) => (text.length > max ? `${text.slice(0, max)}...` : text);
// A failure reason names what the model asked and how the wallet answered: more than a short error line.
const REASON_CHARS = 360;

const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0);
const mean = (values: readonly number[]) => (values.length === 0 ? 0 : sum(values) / values.length);

/** Nearest rank on an ascending list. */
const percentile = (sorted: readonly number[], p: number) =>
  sorted.length === 0 ? 0 : sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))];

const ascending = (values: readonly number[]) => [...values].sort((a, b) => a - b);

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

/** ` [classify 1.9s, extract 3.2s]`, or nothing when the run has no timed calls. */
const stagesText = (stages: readonly Stage[] | undefined) =>
  stages && stages.length > 0 ? `  [${stages.map((stage) => `${stage.label} ${seconds(stage.ms)}`).join(', ')}]` : '';

type RunRecord = { ms: number; stages?: Stage[]; error?: string; outcome?: string; verdict?: Verdict; toolCalling?: ToolCalling };

function summarizeStages(records: readonly RunRecord[]): { stages: StageStats[]; outsideModelMs?: number } {
  const byLabel = new Map<StageLabel, { ms: number[]; tokens: number[] }>();
  for (const record of records) {
    for (const stage of record.stages ?? []) {
      const entry = byLabel.get(stage.label) ?? { ms: [], tokens: [] };
      entry.ms.push(stage.ms);
      if (stage.outputTokens !== undefined) entry.tokens.push(stage.outputTokens);
      byLabel.set(stage.label, entry);
    }
  }
  const stages = [...byLabel].map(([label, { ms, tokens }]): StageStats => {
    const sorted = ascending(ms);
    return {
      label,
      count: ms.length,
      meanMs: mean(ms),
      p50Ms: percentile(sorted, 50),
      p95Ms: percentile(sorted, 95),
      ...(tokens.length > 0 && { meanTokens: mean(tokens) }),
    };
  });
  const timed = records.filter((record) => record.stages !== undefined && record.stages.length > 0);
  return {
    stages,
    ...(timed.length > 0 && { outsideModelMs: mean(timed.map((record) => record.ms - sum((record.stages ?? []).map((stage) => stage.ms)))) }),
  };
}

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
        // A follow-up replays its earlier turns first; the verdict is on the last turn, the time on all.
        const runOptions = { signal, account: !scenario?.noAccount };
        const turns = scenario?.before?.length ? await runner.chat([...scenario.before, prompt], runOptions) : [await runner.ask(prompt, runOptions)];
        if (signal?.aborted) { aborted = true; break rounds; }
        const result = turns[turns.length - 1];
        const summaries = result.prepared.map((prepared) => prepared.summary);
        record.outcome = describeSummaries(summaries);
        record.stages = turns.flatMap((turn) => turn.stages);
        if (scenario) {
          const judged = { prepared: summaries, calls: result.calls, text: result.text };
          record.verdict = checkRun(judged, scenario.expected);
          record.toolCalling = judgeToolCalling(judged, scenario.expected);
          // Nothing prepared: say what the model asked for and what the wallet answered.
          const why = !record.verdict.ok && result.prepared.length === 0 ? explainNothing(result) : undefined;
          if (!record.verdict.ok && why !== undefined) record.verdict = { ok: false, reason: `${record.verdict.reason} (${why})` };
        }
      } catch (error) {
        if (signal?.aborted) { aborted = true; break rounds; }
        const { code, text } = describeError(error);
        const expectedError = scenario?.expected.kind === 'error' ? scenario.expected : undefined;
        if (expectedError) {
          // Raising exactly this error is the outcome the scenario expects.
          record.verdict = code === expectedError.code ? { ok: true } : { ok: false, reason: `raised ${code}, expected ${expectedError.code}` };
        } else {
          record.error = text.startsWith(code) ? text : `${code}: ${text}`;
          bump(errors, code);
        }
      }
      record.ms = now() - runStarted;
      records.push(record);

      const index = String(records.length).padStart(width, '0');
      const tag = `[${index}/${planned}]`;
      const timed = stagesText(record.stages);
      stats[i].runs++;
      if (scenario) {
        const ok = record.error === undefined && record.verdict?.ok === true;
        if (ok) { stats[i].passed++; roundPassed++; }
        const reason = record.error ?? (record.verdict && !record.verdict.ok ? record.verdict.reason : undefined);
        if (reason !== undefined) bump(reasons[i], clip(reason, REASON_CHARS));
        onLog(
          ok
            ? `${tag} PASS ${name}  ${seconds(record.ms)}${timed}`
            : `${tag} FAIL ${name}  ${seconds(record.ms)}${timed}  - ${clip(reason ?? 'unknown', REASON_CHARS)}`
        );
      } else if (record.error !== undefined) {
        onLog(`${tag} ERROR  ${seconds(record.ms)}  - ${record.error}`);
      } else {
        const outcome = record.outcome ?? '';
        const isNew = !outcomes.has(outcome);
        bump(outcomes, outcome);
        onLog(`${tag} ${outcome}  ${seconds(record.ms)}${timed}${isNew ? '  (new outcome)' : ''}`);
      }
    }
    if (target.kind === 'scenarios') {
      onLog(`round ${round}/${runs}: ${roundPassed}/${items.length} passed, ${seconds(now() - startedAt)} elapsed`);
    }
  }

  const times = records.map((record) => record.ms);
  const sorted = ascending(times);
  const outcomeList = ranked(outcomes);
  const half = Math.floor(times.length / 2);
  const passed = target.kind === 'scenarios' ? sum(stats.map((item) => item.passed)) : (outcomeList[0]?.count ?? 0);
  const judgedRuns = records.flatMap((record) => (record.toolCalling ? [record.toolCalling] : []));
  const withArgs = judgedRuns.filter((judged) => judged.args !== undefined);
  const toolCalling = judgedRuns.length === 0 ? undefined : {
    tool: { hit: judgedRuns.filter((judged) => judged.tool).length, total: judgedRuns.length },
    args: { hit: withArgs.filter((judged) => judged.args).length, total: withArgs.length },
  };
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
    ...(toolCalling && { toolCalling }),
    ...summarizeStages(records),
  };
  for (const line of formatReport(report)) onLog(line);
  return report;
}

/** The result as text lines: what to read first, then per scenario or per outcome, then errors. */
export function formatReport(report: BenchmarkReport): string[] {
  const lines = ['', '=== Benchmark result ==='];
  lines.push(`runs: ${report.completed}/${report.planned} completed${report.aborted ? ' (stopped early)' : ''} in ${seconds(report.totalMs)}`);

  if (report.target === 'scenarios') {
    lines.push(`passed: ${rateText({ hit: report.passed, total: report.completed })}`);
    if (report.toolCalling) {
      lines.push(`tool choice: ${rateText(report.toolCalling.tool)}`);
      lines.push(`arguments (right tool only): ${rateText(report.toolCalling.args)}`);
      if (report.errored > 0) lines.push(`  (the tool rates leave out ${report.errored} errored run(s): see errors below)`);
    }
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

  if (report.stages.length > 0) {
    lines.push('', '-- time per model call --');
    for (const stage of report.stages) {
      const tokens = stage.meanTokens === undefined ? '' : `  output tokens ${stage.meanTokens.toFixed(1)}`;
      lines.push(
        `${stage.label.padEnd(8)} calls ${stage.count}  mean ${seconds(stage.meanMs)}  p50 ${seconds(stage.p50Ms)}  p95 ${seconds(stage.p95Ms)}${tokens}`
      );
    }
    if (report.outsideModelMs !== undefined) lines.push(`outside the model: mean ${seconds(report.outsideModelMs)} per run`);
  }

  if (report.target === 'scenarios') {
    lines.push('', '-- per scenario (passed/runs) --');
    for (const item of report.items) {
      const { low, high } = wilson({ hit: item.passed, total: item.runs });
      const interval = item.runs >= 20 ? `  [95% CI ${low.toFixed(1)}-${high.toFixed(1)}%]` : '';
      lines.push(`${String(item.passed).padStart(3)}/${item.runs}  ${item.name}${interval}`);
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
