import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import {
  applyToolEvent,
  GenerateEventType,
  type CallRecord,
  type GenerateEvent,
  type Metrics,
} from '../core';
import type { LLMOnDevice } from './llmOnDevice';

export type RunState = {
  running: boolean;
  text: string;
  reasoning: string;
  calls: CallRecord[];
  metrics: Metrics | null;
  aborted: boolean;
  finishReason?: string;
  warnings: string[];
  error: string | null;
};

const INITIAL_RUN: RunState = {
  running: false,
  text: '',
  reasoning: '',
  calls: [],
  metrics: null,
  aborted: false,
  warnings: [],
  error: null,
};

/** Produces the events of one generation: `llm.generate`, or an agent that wraps it. */
export type GenerationSource = (signal: AbortSignal) => AsyncIterable<GenerateEvent>;

/** The model's status and one generation at a time, for the UI. */
export function useLlm(llm: LLMOnDevice) {
  const status = useSyncExternalStore(llm.subscribe, () => llm.status);
  const [run, setRun] = useState<RunState>(INITIAL_RUN);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  /** Runs one generation. Aborting its signal (see `stop`) ends it. */
  const start = useCallback(async (source: GenerationSource) => {
    if (controllerRef.current) return;

    const controller = new AbortController();
    controllerRef.current = controller;
    let text = '';
    let reasoning = '';
    setRun({ ...INITIAL_RUN, running: true });

    try {
      for await (const event of source(controller.signal)) {
        switch (event.type) {
          case GenerateEventType.Text:
            text += event.delta;
            setRun((prev) => ({ ...prev, text }));
            break;
          case GenerateEventType.Reasoning:
            reasoning += event.delta;
            setRun((prev) => ({ ...prev, reasoning }));
            break;
          case GenerateEventType.Done:
            setRun((prev) => ({
              ...prev,
              metrics: event.metrics,
              aborted: event.aborted,
              finishReason: event.finishReason,
              warnings: event.warnings,
            }));
            break;
          case GenerateEventType.StepStart:
            break;
          default: // tool-call / tool-result / tool-error
            setRun((prev) => ({ ...prev, calls: applyToolEvent(prev.calls, event) }));
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setRun((prev) => ({ ...prev, error: message }));
    } finally {
      controllerRef.current = null;
      setRun((prev) => ({ ...prev, running: false }));
    }
  }, []);

  const stop = useCallback(() => controllerRef.current?.abort(), []);

  return {
    status,
    run,
    start,
    stop,
    load: () => llm.load(),
    unload: () => llm.unload(),
    remove: () => llm.remove(),
  };
}
