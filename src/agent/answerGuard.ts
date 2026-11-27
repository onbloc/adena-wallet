import { GenerateEventType, type GenerateEvent } from '../llm/core';

/**
 * Holds the model's text until the final step. Failed tool calls replace the answer with a fixed
 * message and the turn is not remembered (`messages` is emptied).
 */
export async function* guardAnswer(
  events: AsyncIterable<GenerateEvent>,
  isRead: (toolName: string) => boolean
): AsyncGenerator<GenerateEvent> {
  // Only the last step's text is the answer: earlier steps just announce tool calls.
  let text = '';
  let readSucceeded = false;
  let readFailed = false;
  // A wallet action tool (not a read) returned a result.
  let actionRan = false;

  for await (const event of events) {
    switch (event.type) {
      case GenerateEventType.StepStart:
        text = '';
        yield event;
        break;
      case GenerateEventType.Text:
        text += event.delta;
        break;
      case GenerateEventType.ToolCall:
        if (event.invalid) readFailed = true;
        yield event;
        break;
      case GenerateEventType.ToolResult:
        if (isRead(event.name)) {
          const ok = typeof event.output === 'object' && event.output !== null && 'kind' in event.output && event.output.kind === 'result';
          if (ok) readSucceeded = true;
          else readFailed = true;
        } else {
          actionRan = true;
        }
        yield event;
        break;
      case GenerateEventType.ToolError:
        readFailed = true;
        yield event;
        break;
      case GenerateEventType.Done: {
        if (event.aborted) {
          yield event;
          break;
        }
        const answer = readFailed ? 'Some Onbloc lookups failed. Review the individual tool results.'
          : text || (readSucceeded ? 'Onbloc returned data; no model summary was produced.'
            : actionRan ? 'The wallet action ran; no model summary was produced.' : '');
        yield { type: GenerateEventType.Text, delta: answer };
        yield readFailed ? { ...event, messages: [] } : event;
        break;
      }
      default:
        yield event;
    }
  }
}
