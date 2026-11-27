import { TransactionType, type PreparedTransaction } from '../../../agent';
import { formatReport, runBenchmark } from '../benchmark';
import { ACCOUNT, CAROL, RECIPIENT } from '../fixture';
import type { ScenarioRun, ScenarioRunner } from '../runner';
import type { Scenario } from '../scenarios';
import type { Stage } from '../timing';

const transfer = (to: string, amount: string): PreparedTransaction => ({
  summary: { type: TransactionType.Transfer, chainId: 'c', from: ACCOUNT, to, amount, token: 'GNOT' },
  tx: {},
});
const run = (...prepared: PreparedTransaction[]): ScenarioRun => ({ prepared, calls: [], results: [], text: '', stages: [] });

const send: Scenario = { name: 'send to carol', prompt: 'send 1 to carol', expected: { kind: 'transfer', to: CAROL, amount: '1', token: 'GNOT' } };
const ask: Scenario = { name: 'no recipient', prompt: 'send 1', expected: { kind: 'none', response: 'clarification', evidence: [/recipient/i] } };

let clock = { t: 0 };
type BenchOptions = Parameters<typeof runBenchmark>[0];
/** Runs the benchmark on the fake runner's clock, so run times are the ones the runner reports. */
const bench = (options: Omit<BenchOptions, 'now'>) => runBenchmark({ ...options, now: () => clock.t });

/** Answers each call from `answers` (an Error is thrown) and moves the fake clock by `ms`. */
function fakeRunner(answers: (ScenarioRun | Error)[], { ms = 1000, onAsk }: { ms?: number | number[]; onAsk?: (call: number) => void } = {}) {
  clock = { t: 0 };
  const prompts: string[] = [];
  const signals: (AbortSignal | undefined)[] = [];
  const accounts: (boolean | undefined)[] = [];
  const runner: ScenarioRunner = {
    async ask(prompt, options) {
      const call = prompts.length;
      prompts.push(prompt);
      signals.push(options?.signal);
      accounts.push(options?.account);
      clock.t += Array.isArray(ms) ? ms[call] : ms;
      onAsk?.(call);
      const answer = answers[Math.min(call, answers.length - 1)];
      if (answer instanceof Error) throw answer;
      return answer;
    },
    chat: async () => [],
  };
  return { runner, prompts, signals, accounts, clock };
}

const collect = () => {
  const lines: string[] = [];
  return { lines, onLog: (line: string) => { lines.push(line); } };
};

describe('runBenchmark over scenarios', () => {
  it('runs round by round, so every scenario is spread over the whole benchmark', async () => {
    const { runner, prompts } = fakeRunner([run(transfer(CAROL, '1')), run()]);
    const { onLog } = collect();

    await bench({ runner, target: { kind: 'scenarios', scenarios: [send, ask] }, runs: 2, onLog });

    expect(prompts).toEqual([send.prompt, ask.prompt, send.prompt, ask.prompt]);
  });

  it('counts passes per scenario and says what the model got wrong', async () => {
    const answers = [run(transfer(CAROL, '1')), { ...run(), text: 'Which recipient?' }, run(transfer(CAROL, '2')), { ...run(), text: 'Which recipient?' }];
    const { runner } = fakeRunner(answers);
    const { lines, onLog } = collect();

    const report = await bench({ runner, target: { kind: 'scenarios', scenarios: [send, ask] }, runs: 2, onLog });

    expect(report).toMatchObject({ planned: 4, completed: 4, aborted: false, passed: 3, errored: 0 });
    expect(report.items[0]).toMatchObject({ name: send.name, runs: 2, passed: 1, reasons: [{ text: 'amount: got 2, expected 1', count: 1 }] });
    expect(report.items[1]).toMatchObject({ runs: 2, passed: 2, reasons: [] });
    expect(lines).toContain('[1/4] PASS send to carol  1.0s');
    expect(lines.find((line) => line.startsWith('[3/4]'))).toBe('[3/4] FAIL send to carol  1.0s  - amount: got 2, expected 1');
    expect(lines).toContain('round 1/2: 2/2 passed, 2.0s elapsed');
    expect(lines).toContain('round 2/2: 1/2 passed, 4.0s elapsed');
  });

  it('fails a silent no-transaction result instead of counting it as a successful clarification', async () => {
    const { runner } = fakeRunner([run()]);
    const { onLog } = collect();
    const report = await bench({ runner, target: { kind: 'scenarios', scenarios: [ask] }, runs: 1, onLog });
    expect(report.passed).toBe(0);
    expect(report.items[0].reasons).toEqual([{ text: 'expected clarification, got an empty response', count: 1 }]);
  });

  it('counts an error by its code, fails that run and carries on', async () => {
    const { runner } = fakeRunner([new Error('AGENT_INTENT_INVALID: The model did not return a valid request classification.\nmore'), run(transfer(CAROL, '1'))]);
    const { lines, onLog } = collect();

    const report = await bench({ runner, target: { kind: 'scenarios', scenarios: [send] }, runs: 3, onLog });

    expect(report).toMatchObject({ completed: 3, passed: 2, errored: 1, errors: [{ code: 'AGENT_INTENT_INVALID', count: 1 }] });
    expect(lines.find((line) => line.startsWith('[1/3]'))).toBe(
      '[1/3] FAIL send to carol  1.0s  - AGENT_INTENT_INVALID: The model did not return a valid request classification.'
    );
  });

  it('measures run times and compares the two halves', async () => {
    const { runner } = fakeRunner([run(transfer(CAROL, '1'))], { ms: [1000, 1000, 2000, 5000] });
    const { onLog } = collect();

    const report = await bench({ runner, target: { kind: 'scenarios', scenarios: [send] }, runs: 4, onLog });

    expect(report.timing).toEqual({ meanMs: 2250, p50Ms: 1000, p95Ms: 5000, maxMs: 5000 });
    expect(report.halves).toEqual({ firstMs: 1000, secondMs: 3500 });
    expect(report.totalMs).toBe(9000);
    expect(formatReport(report)).toContain('first half 1.0s -> second half 3.5s (+250%)');
  });
});

describe('runBenchmark over one prompt', () => {
  it('reports a single outcome as consistent', async () => {
    const { runner } = fakeRunner([run(transfer(CAROL, '1'))]);
    const { lines, onLog } = collect();

    const report = await bench({ runner, target: { kind: 'prompt', prompt: ' send 1 to carol ' }, runs: 3, onLog });

    expect(report).toMatchObject({ target: 'prompt', passed: 3, outcomes: [{ text: `transfer 1 GNOT to ${CAROL}`, count: 3 }] });
    expect(lines).toContain('consistent: yes - 1 distinct outcome(s), 0 error(s)');
  });

  it('groups different outcomes, most common first, and flags the first time each appears', async () => {
    const { runner } = fakeRunner([run(transfer(CAROL, '1')), run(transfer(CAROL, '1')), run(transfer(RECIPIENT, '1')), run(transfer(CAROL, '1'))]);
    const { lines, onLog } = collect();

    const report = await bench({ runner, target: { kind: 'prompt', prompt: 'send' }, runs: 4, onLog });

    expect(report.outcomes).toEqual([
      { text: `transfer 1 GNOT to ${CAROL}`, count: 3 },
      { text: `transfer 1 GNOT to ${RECIPIENT}`, count: 1 },
    ]);
    expect(lines.filter((line) => line.includes('(new outcome)'))).toHaveLength(2);
    expect(lines).toContain('consistent: NO - 2 distinct outcome(s), 0 error(s)');
  });

  it('is not consistent when a run fails, even if the others agree', async () => {
    const { runner } = fakeRunner([run(transfer(CAROL, '1')), new Error('AGENT_PREPARATION_INVALID: x')]);
    const { lines, onLog } = collect();

    await bench({ runner, target: { kind: 'prompt', prompt: 'send' }, runs: 2, onLog });

    expect(lines).toContain('consistent: NO - 1 distinct outcome(s), 1 error(s)');
  });
});

describe('runBenchmark control', () => {
  it('stops at once when aborted, and does not count the run that was cut off', async () => {
    const controller = new AbortController();
    const { runner, signals } = fakeRunner([run(transfer(CAROL, '1'))], { onAsk: (call) => { if (call === 2) controller.abort(); } });
    const { lines, onLog } = collect();

    const report = await bench({ runner, target: { kind: 'scenarios', scenarios: [send] }, runs: 10, signal: controller.signal, onLog });

    expect(report).toMatchObject({ planned: 10, completed: 2, aborted: true });
    expect(signals.every((signal) => signal === controller.signal)).toBe(true);
    // The run that was cut off took 1.0s of wall time, though it is not counted as a run.
    expect(lines).toContain('runs: 2/10 completed (stopped early) in 3.0s');
  });

  it('does not start when preflight fails, and logs why', async () => {
    const { runner, prompts } = fakeRunner([run()]);
    const { lines, onLog } = collect();

    await expect(
      bench({ runner, target: { kind: 'scenarios', scenarios: [send] }, runs: 1, onLog, preflight: async () => { throw new Error('fake reads failed'); } })
    ).rejects.toThrow('fake reads failed');

    expect(prompts).toEqual([]);
    expect(lines).toContain('preflight failed: fake reads failed');
  });

  it('logs the header and preflight result before the first run', async () => {
    const { runner } = fakeRunner([run(transfer(CAROL, '1'))]);
    const { lines, onLog } = collect();

    await bench({ runner, target: { kind: 'scenarios', scenarios: [send] }, runs: 1, onLog, header: ['device: test'], preflight: async () => 'reads ok' });

    expect(lines.slice(0, 3)).toEqual(['device: test', 'Benchmark: 1 scenarios x 1 runs = 1 runs', 'preflight: reads ok']);
  });

  it.each([0, -1, 1.5, NaN])('rejects %s runs', async (runs) => {
    await expect(bench({ runner: fakeRunner([run()]).runner, target: { kind: 'prompt', prompt: 'x' }, runs, onLog: () => {} })).rejects.toThrow(RangeError);
  });

  it('rejects an empty prompt', async () => {
    await expect(bench({ runner: fakeRunner([run()]).runner, target: { kind: 'prompt', prompt: '  ' }, runs: 1, onLog: () => {} })).rejects.toThrow(TypeError);
  });
});

describe('runBenchmark per model call', () => {
  const timed = (stages: Stage[], ...prepared: PreparedTransaction[]): ScenarioRun => ({ ...run(...prepared), stages });

  it('shows each call of a run in the log and summarizes them per call', async () => {
    const { runner, } = fakeRunner(
      [
        timed([{ label: 'classify', ms: 400, outputTokens: 6 }, { label: 'extract', ms: 600, outputTokens: 40 }], transfer(CAROL, '1')),
        timed([{ label: 'classify', ms: 600, outputTokens: 6 }, { label: 'extract', ms: 1000, outputTokens: 44 }], transfer(CAROL, '1')),
      ],
      { ms: [1000, 2000] }
    );
    const { lines, onLog } = collect();

    const report = await bench({ runner, target: { kind: 'scenarios', scenarios: [send] }, runs: 2, onLog });

    expect(lines).toContain('[1/2] PASS send to carol  1.0s  [classify 0.4s, extract 0.6s]');
    expect(report.stages).toEqual([
      { label: 'classify', count: 2, meanMs: 500, p50Ms: 400, p95Ms: 600, meanTokens: 6 },
      { label: 'extract', count: 2, meanMs: 800, p50Ms: 600, p95Ms: 1000, meanTokens: 42 },
    ]);
    // Run 1 took 1000 ms of which the model 1000; run 2 took 2000 of which 1600: 200 ms outside on average.
    expect(report.outsideModelMs).toBe(200);
    expect(lines).toContain('classify calls 2  mean 0.5s  p50 0.4s  p95 0.6s  output tokens 6.0');
    expect(lines).toContain('outside the model: mean 0.2s per run');
  });

  it('leaves the per-call section out when the runner reports no calls', async () => {
    const { runner } = fakeRunner([run(transfer(CAROL, '1'))]);
    const { lines, onLog } = collect();

    const report = await bench({ runner, target: { kind: 'scenarios', scenarios: [send] }, runs: 2, onLog });

    expect(report.stages).toEqual([]);
    expect(report.outsideModelMs).toBeUndefined();
    expect(lines).not.toContain('-- time per model call --');
  });
});

describe('runBenchmark explains a run that prepared nothing', () => {
  const refused: ScenarioRun = {
    prepared: [],
    calls: [{ name: 'transfer', input: { to: 'g1x가' }, invalid: false }],
    results: [{ name: 'transfer', output: { kind: 'result', value: { status: 'error', code: 'invalid_address', message: 'bad address' } } }],
    text: '',
    stages: [],
  };

  it('adds what the model asked and how the wallet answered to the FAIL line and the report', async () => {
    const { runner } = fakeRunner([refused]);
    const { lines, onLog } = collect();

    const report = await bench({ runner, target: { kind: 'scenarios', scenarios: [send] }, runs: 1, onLog });

    const why = 'prepared nothing, expected 1 (the model asked transfer({"to":"g1x가"}); the wallet refused: invalid_address - bad address)';
    expect(lines).toContain(`[1/1] FAIL send to carol  1.0s  - ${why}`);
    expect(report.items[0].reasons).toEqual([{ text: why, count: 1 }]);
  });

  it('does not add an explanation to a wrong transaction, whose summary already says what is wrong', async () => {
    const { runner } = fakeRunner([run(transfer(CAROL, '2'))]);
    const { onLog } = collect();

    const report = await bench({ runner, target: { kind: 'scenarios', scenarios: [send] }, runs: 1, onLog });

    expect(report.items[0].reasons).toEqual([{ text: 'amount: got 2, expected 1', count: 1 }]);
  });
});

describe('runBenchmark follow-ups and answers', () => {
  const stage: Stage = { label: 'classify', ms: 100 };
  const turn = (...prepared: PreparedTransaction[]): ScenarioRun => ({ ...run(...prepared), stages: [stage] });
  const thanks: Scenario = { name: 'thanks', prompt: 'thanks', before: ['send 1 to carol'], expected: { kind: 'none' } };
  const chatRunner = (turns: ScenarioRun[]) => {
    const chats: (readonly string[])[] = [];
    const runner: ScenarioRunner = {
      ask: async () => { throw new Error('a follow-up must run as one conversation'); },
      chat: async (prompts) => { chats.push(prompts); return turns; },
    };
    return { runner, chats };
  };

  it('replays the earlier turns in one conversation and judges only the last turn', async () => {
    const { runner, chats } = chatRunner([turn(transfer(CAROL, '1')), turn()]);
    const { onLog } = collect();

    const report = await bench({ runner, target: { kind: 'scenarios', scenarios: [thanks] }, runs: 1, onLog });

    expect(chats).toEqual([['send 1 to carol', 'thanks']]);
    expect(report).toMatchObject({ passed: 1, errored: 0 });
  });

  it('fails a follow-up that repeats what an earlier turn prepared', async () => {
    const { runner } = chatRunner([turn(transfer(CAROL, '1')), turn(transfer(CAROL, '1'))]);
    const { onLog } = collect();

    const report = await bench({ runner, target: { kind: 'scenarios', scenarios: [thanks] }, runs: 1, onLog });

    expect(report.items[0].reasons).toEqual([{ text: `prepared transfer 1 GNOT to ${CAROL}, expected nothing`, count: 1 }]);
  });

  it('counts the model calls of every turn', async () => {
    const { runner } = chatRunner([turn(), turn()]);
    const { onLog } = collect();

    const report = await bench({ runner, target: { kind: 'scenarios', scenarios: [thanks] }, runs: 1, onLog });

    expect(report.stages).toMatchObject([{ label: 'classify', count: 2 }]);
  });

  it('judges an answer on the tools the model called', async () => {
    const explain: Scenario = { name: 'what is GNOT', prompt: 'What is GNOT?', expected: { kind: 'answer', reads: [] } };
    const called: ScenarioRun = { ...run(), calls: [{ name: 'get_balance', input: {}, invalid: false }] };
    const { runner } = fakeRunner([run(), called]);
    const { onLog } = collect();

    const report = await bench({ runner, target: { kind: 'scenarios', scenarios: [explain] }, runs: 2, onLog });

    expect(report.items[0]).toMatchObject({ runs: 2, passed: 1, reasons: [{ text: 'called get_balance({}), expected no tool call', count: 1 }] });
  });
});

describe('runBenchmark without an account and with an expected error', () => {
  const linkWallet: Scenario = {
    name: 'balance without a wallet', prompt: 'my balance?', noAccount: true, expected: { kind: 'error', code: 'AGENT_ACCOUNT_REQUIRED' },
  };
  const raised = (code: string) => new Error(`${code}: Link a wallet to read wallet data or prepare transactions.`);
  const target = { kind: 'scenarios', scenarios: [linkWallet] } as const;

  it('runs a scenario that has no linked wallet without an account, and the others with one', async () => {
    const { runner, accounts } = fakeRunner([raised('AGENT_ACCOUNT_REQUIRED'), run()]);
    const { onLog } = collect();

    await bench({ runner, target: { kind: 'scenarios', scenarios: [linkWallet, ask] }, runs: 1, onLog });

    expect(accounts).toEqual([false, true]);
  });

  it('passes when the agent raises exactly the expected error, which is not counted as an error', async () => {
    const { runner } = fakeRunner([raised('AGENT_ACCOUNT_REQUIRED')]);
    const { lines, onLog } = collect();

    const report = await bench({ runner, target, runs: 1, onLog });

    expect(report).toMatchObject({ passed: 1, errored: 0 });
    expect(lines).toContain('[1/1] PASS balance without a wallet  1.0s');
  });

  it('fails, saying what happened, when another error is raised or none', async () => {
    const other = await bench({ runner: fakeRunner([raised('AGENT_INTENT_INVALID')]).runner, target, runs: 1, onLog: collect().onLog });
    const none = await bench({ runner: fakeRunner([run()]).runner, target, runs: 1, onLog: collect().onLog });

    expect(other.items[0]).toMatchObject({ passed: 0, reasons: [{ text: 'raised AGENT_INTENT_INVALID, expected AGENT_ACCOUNT_REQUIRED', count: 1 }] });
    expect(none.items[0]).toMatchObject({ passed: 0, reasons: [{ text: 'raised no error, expected AGENT_ACCOUNT_REQUIRED', count: 1 }] });
  });
});

describe('runBenchmark tool calling and hit-rate intervals', () => {
  const gnotOne = { kind: 'one', asset: { kind: 'symbol', value: 'GNOT' } };
  const read: Scenario = {
    name: 'balance of GNOT',
    prompt: 'how much GNOT?',
    expected: { kind: 'answer', reads: [{ name: 'get_balance', input: gnotOne }] },
  };
  const calling = (input: unknown): ScenarioRun => ({ ...run(), calls: [{ name: 'get_balance', input, invalid: false }] });

  it('counts the right tool, and the arguments only of the runs that used it', async () => {
    // Right tool and input; right tool, wrong input; no tool at all.
    const { runner } = fakeRunner([calling(gnotOne), calling({ kind: 'all' }), run()]);
    const { lines, onLog } = collect();

    const report = await bench({ runner, target: { kind: 'scenarios', scenarios: [read] }, runs: 3, onLog });

    expect(report.toolCalling).toEqual({ tool: { hit: 2, total: 3 }, args: { hit: 1, total: 2 } });
    expect(lines.some((line) => line.startsWith('tool choice: 2/3 (66.7%, 95% CI '))).toBe(true);
    expect(lines.some((line) => line.startsWith('arguments (right tool only): 1/2 (50.0%, 95% CI '))).toBe(true);
  });

  it('leaves an errored run out of the tool rates, and says so next to them', async () => {
    const { runner } = fakeRunner([calling(gnotOne), new Error('AGENT_INTENT_INVALID: bad')]);
    const { lines, onLog } = collect();

    const report = await bench({ runner, target: { kind: 'scenarios', scenarios: [read] }, runs: 2, onLog });

    expect(report).toMatchObject({ passed: 1, errored: 1, toolCalling: { tool: { hit: 1, total: 1 } } });
    expect(lines).toContain('  (the tool rates leave out 1 errored run(s): see errors below)');
  });

  it('reports unavailable argument rates when no arguments can be judged', async () => {
    const { runner } = fakeRunner([run()]);
    const { lines, onLog } = collect();
    await bench({ runner, target: { kind: 'scenarios', scenarios: [read] }, runs: 1, onLog });
    expect(lines).toContain('arguments (right tool only): 0/0 (N/A)');
  });

  it('gives the 95% Wilson interval of a hit rate, which is far from 100% after a few clean runs', async () => {
    const { runner } = fakeRunner([calling(gnotOne)]);
    const { lines, onLog } = collect();

    await bench({ runner, target: { kind: 'scenarios', scenarios: [read] }, runs: 20, onLog });

    expect(lines).toContain('passed: 20/20 (100.0%, 95% CI 83.9-100.0%)');
    expect(lines).toContain(' 20/20  balance of GNOT  [95% CI 83.9-100.0%]');
  });

  it('leaves the interval off a scenario with few runs, and reports no tool calling for a prompt', async () => {
    const { runner } = fakeRunner([calling(gnotOne)]);
    const { lines, onLog } = collect();
    await bench({ runner, target: { kind: 'scenarios', scenarios: [read] }, runs: 2, onLog });
    expect(lines).toContain('  2/2  balance of GNOT');

    const prompt = await bench({ runner: fakeRunner([run()]).runner, target: { kind: 'prompt', prompt: 'send 1 to carol' }, runs: 1, onLog: collect().onLog });
    expect(prompt.toolCalling).toBeUndefined();
  });
});
