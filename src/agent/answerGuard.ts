import { GenerateEventType, type GenerateEvent } from '../llm/core';
import { ToolName, WalletStatus } from './wallet/constants';

/**
 * Holds the model's text back and shows it only if the tools support it. Answers that rest on
 * no lookup, or on a failed one, are replaced by a fixed message, and such a turn is not
 * remembered (`messages` is emptied). `isRead` tells the read tools from the wallet actions.
 */
export async function* guardAnswer(
  events: AsyncIterable<GenerateEvent>,
  isRead: (toolName: string) => boolean
): AsyncGenerator<GenerateEvent> {
  // Only the last step's text is the answer: earlier steps just announce tool calls.
  let text = '';
  let readSucceeded = false;
  let readFailed = false;
  const outcomes: string[] = [];

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
          const output = event.output;
          const status = typeof output === 'object' && output !== null && 'status' in output ? output.status : undefined;
          if (event.name === ToolName.GetApprovals) {
            if (status === WalletStatus.Ok) readSucceeded = true;
            else readFailed = true;
          } else {
            outcomes.push(status === WalletStatus.Prepared ? 'Unsigned transaction prepared. Nothing was sent.'
              : 'Transaction preparation was not confirmed.');
          }
        }
        yield event;
        break;
      case GenerateEventType.ToolError:
        if (event.name === ToolName.Transfer || event.name === ToolName.Approve) outcomes.push('Transaction preparation was not confirmed.');
        else readFailed = true;
        yield event;
        break;
      case GenerateEventType.Done: {
        if (event.aborted && outcomes.length === 0) {
          yield event;
          break;
        }
        const trusted = readSucceeded && !readFailed && !outcomes.length;
        const lookupFailure = 'Some Onbloc lookups failed. Review the individual tool results.';
        const answer = outcomes.length ? [...outcomes, ...(readFailed ? [lookupFailure] : [])].join(' ')
          : !readSucceeded ? 'No Onbloc lookup returned verified data.'
            : readFailed ? lookupFailure : text || 'Onbloc returned data; no model summary was produced.';
        yield { type: GenerateEventType.Text, delta: answer };
        yield trusted ? event : { ...event, messages: [] };
        break;
      }
      default:
        yield event;
    }
  }
}
