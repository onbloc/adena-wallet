import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { applyToolEvent, type CallRecord } from '../core/calls';
import {
  generate,
  GenerateEventType,
  type GenerateSettings,
  type Metrics,
} from '../core/generate';
import { withCompletedToolCalls } from '../../agent/run';
import { llamaRuntime } from './runtime';

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

/** Runtime status + one generation at a time, for the UI. */
export function useLlm() {
  const status = useSyncExternalStore(
    llamaRuntime.subscribe,
    () => llamaRuntime.status
  );
  const [run, setRun] = useState<RunState>(INITIAL_RUN);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const start = useCallback(async (options: GenerateSettings) => {
    const model = llamaRuntime.model;
    if (controllerRef.current) return;
    if (!model) {
      setRun({ ...INITIAL_RUN, error: 'Model is not loaded' });
      return;
    }

    const controller = new AbortController();
    controllerRef.current = controller;
    let text = '';
    let reasoning = '';
    setRun({ ...INITIAL_RUN, running: true });

    try {
      const generationModel = options.onbloc ? withCompletedToolCalls(model) : model;
      for await (const event of generate(generationModel, {
        ...options,
        signal: controller.signal,
      })) {
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
    load: llamaRuntime.load.bind(llamaRuntime),
    unload: llamaRuntime.unload.bind(llamaRuntime),
    remove: llamaRuntime.remove.bind(llamaRuntime),
  };
}
