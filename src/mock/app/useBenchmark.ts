import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import type { LLM } from '../../llm/core';
import { runBenchmark, type BenchmarkTarget } from '../scenario/benchmark';
import { createBenchmarkWallet } from '../scenario/benchmarkWallet';
import { ACCOUNT, FAKE_ENDPOINT, fakeReads } from '../scenario/fixture';
import { createScenarioRunner, type ScenarioSettings } from '../scenario/runner';
import { fetchOnblocBalances } from '../wallet/onblocWallet';

/** Fixed, so results compare across devices and builds; the Settings values do not apply. */
export const BENCHMARK_SETTINGS = { temperature: 0, maxOutputTokens: 512, reasoning: 'none' } as const satisfies ScenarioSettings;

/** The Repeat set samples on purpose: at temperature 0 a repeat only repeats itself. */
export const REPEAT_SETTINGS = { ...BENCHMARK_SETTINGS, temperature: 0.7 } as const satisfies ScenarioSettings;

export const BENCHMARK_RUNS_RANGE = { min: 1, max: 1000 } as const;
export const DEFAULT_BENCHMARK_RUNS = 10;

// The screen shows the end of the log; Copy takes all of it.
const TAIL_LINES = 300;
const REDRAW_MS = 150;

/** Runs the benchmark on the given model (on-device or hosted) and keeps its log for the screen. */
export function useBenchmark(llm: LLM) {
  const [running, setRunning] = useState(false);
  // What the screen draws; `lines` below keeps every line.
  const [view, setView] = useState<{ total: number; tail: readonly string[] }>({ total: 0, tail: [] });
  const lines = useRef<string[]>([]);
  const redrawScheduled = useRef(false);
  const mounted = useRef(true);
  const controller = useRef<AbortController | null>(null);

  const redrawNow = useCallback(() => {
    if (mounted.current) setView({ total: lines.current.length, tail: lines.current.slice(-TAIL_LINES) });
  }, []);

  const log = useCallback(
    (line: string) => {
      lines.current.push(line);
      // However fast the lines come, draw at most every REDRAW_MS.
      if (!redrawScheduled.current) {
        redrawScheduled.current = true;
        setTimeout(() => {
          redrawScheduled.current = false;
          redrawNow();
        }, REDRAW_MS);
      }
    },
    [redrawNow]
  );

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
    };
  }, []);

  /** `runs` times each scenario, or `runs` times the one prompt. `llmHeader`: log lines about the model. */
  const start = useCallback(
    async (target: BenchmarkTarget, runs: number, llmHeader: readonly string[], settings: typeof BENCHMARK_SETTINGS | typeof REPEAT_SETTINGS = BENCHMARK_SETTINGS) => {
      if (controller.current) return;
      const abort = new AbortController();
      controller.current = abort;
      lines.current = [];
      setRunning(true);
      try {
        await runBenchmark({
          runner: createScenarioRunner({ llm, createWallet: createBenchmarkWallet, settings }),
          target,
          runs,
          signal: abort.signal,
          onLog: log,
          header: [
            `device: ${Platform.OS} ${Platform.Version}`,
            `build: ${__DEV__ ? 'development (slower JavaScript side)' : 'release'}`,
            ...llmHeader,
            `settings: temperature ${settings.temperature}, max output tokens ${settings.maxOutputTokens}, reasoning ${settings.reasoning} (fixed${settings === REPEAT_SETTINGS ? '; Repeat samples on purpose' : ''})`,
            'wallet: mock wallet, fake Onbloc reads (10 GNOT, 250 GNS), contact carol',
            `started: ${new Date().toISOString()}`,
          ],
          // The fake reads run through the MCP client in this runtime; find out before the model is busy.
          preflight: async () => {
            const balances = await fetchOnblocBalances({ endpoint: FAKE_ENDPOINT, fetcher: fakeReads().fetcher, account: ACCOUNT }, abort.signal);
            return `fake Onbloc reads work (${Object.entries(balances).map(([token, amount]) => `${amount} ${token}`).join(', ')})`;
          },
        });
      } catch (error) {
        log(`benchmark did not finish: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        controller.current = null;
        if (mounted.current) setRunning(false);
        redrawNow();
      }
    },
    [llm, log, redrawNow]
  );

  const stop = useCallback(() => controller.current?.abort(), []);

  const clear = useCallback(() => {
    lines.current = [];
    redrawNow();
  }, [redrawNow]);

  /** The whole log, for copying. */
  const text = useCallback(() => lines.current.join('\n'), []);

  return { running, total: view.total, tail: view.tail, start, stop, clear, text };
}
