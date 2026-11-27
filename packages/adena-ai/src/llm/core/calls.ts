import { GenerateEventType, type GenerateEvent } from './generate';

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
  {
    type:
      | typeof GenerateEventType.ToolCall
      | typeof GenerateEventType.ToolResult
      | typeof GenerateEventType.ToolError;
  }
>;

/** Folds tool events into an ordered call list (results are matched by call id). */
export function applyToolEvent(calls: CallRecord[], event: ToolEvent): CallRecord[] {
  switch (event.type) {
    case GenerateEventType.ToolCall:
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
    case GenerateEventType.ToolResult:
      return calls.map((call) =>
        call.id === event.id ? { ...call, output: event.output } : call
      );
    case GenerateEventType.ToolError:
      return calls.map((call) =>
        call.id === event.id ? { ...call, error: call.error ?? event.error } : call
      );
  }
}
