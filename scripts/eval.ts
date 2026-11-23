/// <reference types="node" />
// Runs the wallet scenarios against a real model served by llama-server and
// prints pass rates. Uses the same harness code as the app (tools, prompt,
// generate, evaluate). Not part of `npm test`: slow and non-deterministic.
//
//   llama-server -hf bartowski/Qwen_Qwen3.5-2B-GGUF:Q4_K_M --jinja -c 4096 -np 1 --reasoning off --port 8089
//   bun scripts/eval.ts --runs 10
import { readFileSync, writeFileSync } from 'node:fs';

import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { LanguageModel } from 'ai';

import { applyToolEvent, type CallRecord } from '../src/llm/calls';
import { DEFAULT_GENERATE_SETTINGS, MAX_STEPS } from '../src/llm/config';
import { generate, GenerateEventType } from '../src/llm/generate';
import { evaluateScenario } from '../src/wallet/evaluate';
import { formatReport, summarize, type RunResult } from '../src/wallet/evalReport';
import { MockWallet } from '../src/wallet/mockWallet';
import { buildSystemPrompt } from '../src/wallet/prompts';
import { SCENARIOS, type Scenario } from '../src/wallet/scenarios';
import { createWalletTools } from '../src/wallet/tools';

const USAGE = `Usage: bun scripts/eval.ts [options]
  --runs N           runs per scenario (default 10)
  --scenario a,b     scenario ids (default: all of ${SCENARIOS.map((s) => s.id).join(', ')})
  --url URL          OpenAI-compatible base URL (default http://127.0.0.1:8089/v1)
  --model NAME       model name sent to the server (default qwen)
  --temperature T    (default ${DEFAULT_GENERATE_SETTINGS.temperature})
  --max-tokens N     per model call (default ${DEFAULT_GENERATE_SETTINGS.maxOutputTokens})
  --max-steps N      model calls per run (default ${MAX_STEPS})
  --seed N           base seed; run i uses seed+i (default 1)
  --system-file P    use this file as the system prompt instead of the app's
  --out P            also write the full results as JSON
  --verbose          print calls and answer of every failed run`;

type Options = {
  runs: number;
  scenarios: Scenario[];
  url: string;
  model: string;
  temperature: number;
  maxTokens: number;
  maxSteps: number;
  seed: number;
  system: string;
  out?: string;
  verbose: boolean;
};

function parseOptions(argv: string[]): Options {
  const raw = new Map<string, string>();
  const flags = new Set<string>();
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (key === '--verbose') flags.add('verbose');
    else if (key.startsWith('--') && i + 1 < argv.length) raw.set(key.slice(2), argv[++i]);
    else throw new Error(`Unexpected argument: ${key}`);
  }
  const known = ['runs', 'scenario', 'url', 'model', 'temperature', 'max-tokens', 'max-steps', 'seed', 'system-file', 'out'];
  for (const key of raw.keys()) if (!known.includes(key)) throw new Error(`Unknown option: --${key}`);

  const num = (key: string, fallback: number, min: number, max: number, integer = true) => {
    const text = raw.get(key);
    if (text === undefined) return fallback;
    const value = Number(text);
    const ok = text.trim() !== '' && Number.isFinite(value) && value >= min && value <= max;
    if (!ok || (integer && !Number.isInteger(value))) {
      throw new Error(`--${key} must be ${integer ? 'an integer' : 'a number'} in [${min}, ${max}]`);
    }
    return value;
  };

  const ids = raw.get('scenario')?.split(',').map((id) => id.trim());
  const scenarios = ids === undefined ? SCENARIOS : ids.map((id) => {
    const found = SCENARIOS.find((s) => s.id === id);
    if (!found) throw new Error(`Unknown scenario: ${id}`);
    return found;
  });
  const systemFile = raw.get('system-file');

  return {
    runs: num('runs', 10, 1, 1000),
    scenarios,
    url: raw.get('url') ?? 'http://127.0.0.1:8089/v1',
    model: raw.get('model') ?? 'qwen',
    temperature: num('temperature', DEFAULT_GENERATE_SETTINGS.temperature, 0, 2, false),
    maxTokens: num('max-tokens', DEFAULT_GENERATE_SETTINGS.maxOutputTokens, 1, 4095),
    maxSteps: num('max-steps', MAX_STEPS, 1, 20),
    seed: num('seed', 1, 0, 2 ** 31 - 1),
    system: systemFile ? readFileSync(systemFile, 'utf8') : buildSystemPrompt(new MockWallet()),
    out: raw.get('out'),
    verbose: flags.has('verbose'),
  };
}

async function runOnce(
  model: LanguageModel,
  scenario: Scenario,
  seed: number,
  options: Options
): Promise<RunResult> {
  const wallet = new MockWallet();
  let calls: CallRecord[] = [];
  let text = '';
  let totalMs: number | null = null;
  let outputTokens: number | undefined;

  try {
    for await (const event of generate(model, {
      prompt: scenario.prompt,
      system: options.system,
      temperature: options.temperature,
      maxOutputTokens: options.maxTokens,
      seed,
      tools: createWalletTools(wallet),
      maxSteps: options.maxSteps,
    })) {
      switch (event.type) {
        case GenerateEventType.Text:
          text += event.delta;
          break;
        case GenerateEventType.Done:
          totalMs = event.metrics.totalMs;
          outputTokens = event.metrics.outputTokens;
          break;
        case GenerateEventType.Reasoning:
          break;
        default:
          calls = applyToolEvent(calls, event);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { scenarioId: scenario.id, pass: false, failedChecks: ['run error'], calls, text, totalMs, error: message };
  }

  const verdict = evaluateScenario(scenario, calls, text);
  return {
    scenarioId: scenario.id,
    pass: verdict.pass,
    failedChecks: verdict.checks.filter((c) => !c.pass).map((c) => c.name),
    calls,
    text,
    totalMs,
    outputTokens,
  };
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const baseUrl = options.url.replace(/\/$/, '');

  try {
    const response = await fetch(`${baseUrl}/models`, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    throw new Error(`Cannot reach the model server at ${baseUrl} (${String(error)}). Start llama-server first.`);
  }

  const model = createOpenAICompatible({ name: 'llama-server', baseURL: baseUrl }).chatModel(options.model);
  const results: RunResult[] = [];

  for (const scenario of options.scenarios) {
    for (let i = 0; i < options.runs; i++) {
      const result = await runOnce(model, scenario, options.seed + i, options);
      results.push(result);
      process.stderr.write(`${scenario.id} ${i + 1}/${options.runs} ${result.pass ? 'PASS' : 'FAIL'}\n`);
      if (!result.pass && options.verbose) {
        const calls = result.calls.map((c) => `${c.invalid ? '[INVALID] ' : ''}${c.name}(${JSON.stringify(c.input)})`);
        process.stderr.write(`  failed: ${result.failedChecks.join('; ')}\n  calls: ${calls.join(', ') || 'none'}\n  answer: ${result.text.replace(/\s+/g, ' ').slice(0, 300)}\n${result.error ? `  error: ${result.error}\n` : ''}`);
      }
    }
  }

  const summary = summarize(results, SCENARIOS);
  console.log(`\n${formatReport(summary)}`);
  if (options.out) {
    const { system: _system, scenarios: _scenarios, ...config } = options;
    writeFileSync(options.out, JSON.stringify({ config, summary, results }, null, 2));
    console.log(`\nwrote ${options.out}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  console.error(`\n${USAGE}`);
  process.exit(1);
});
