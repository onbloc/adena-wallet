import type { GenerateEvent } from './generate';

/** One tool call the model made, with what came back for it. */
export type CallRecord = {
  id: string;
  name: string;
  input: unknown;
  /** Unparsable / unknown tool / failed schema validation: never executed. */
  invalid: boolean;
  error?: string;
  /** Present once the tool has run. */
  output?: unknown;
};

export type ToolEvent = Extract<
  GenerateEvent,
  { type: 'tool-call' | 'tool-result' | 'tool-error' }
>;

/** Folds tool events into an ordered call list (results are matched by call id). */
export function applyToolEvent(calls: CallRecord[], event: ToolEvent): CallRecord[] {
  switch (event.type) {
    case 'tool-call':
      return [
        ...calls,
        {
          id: event.id,
          name: event.name,
          input: event.input,
          invalid: event.invalid,
          error: event.error,
        },
      ];
    case 'tool-result':
      return calls.map((call) =>
        call.id === event.id ? { ...call, output: event.output } : call
      );
    case 'tool-error':
      return calls.map((call) =>
        call.id === event.id ? { ...call, error: call.error ?? event.error } : call
      );
  }
}
