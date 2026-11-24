import { GenerateEventType, type GenerateEvent } from '../llm/core';
import { ToolName, WalletStatus } from './wallet/constants';
import { formatOnblocBalance } from './onblocBalances';

/**
 * Renders wallet outcomes from tool results. Tool-free text is a model explanation, not a
 * verified wallet lookup. Failed/incomplete tool runs cannot become trusted conversation turns.
 */
export async function* guardAnswer(
  events: AsyncIterable<GenerateEvent>,
  isRead: (toolName: string) => boolean
): AsyncGenerator<GenerateEvent> {
  // Only the last step's text is the answer: earlier steps just announce tool calls.
  let text = '';
  let readSucceeded = false;
  let readFailed = false;
  let toolAttempted = false;
  const outcomes: string[] = [];
  const balances = new Map<string, string>();
  const pending = new Set<string>();

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
        toolAttempted = true;
        pending.add(event.id);
        if (event.invalid) readFailed = true;
        yield event;
        break;
      case GenerateEventType.ToolResult: {
        toolAttempted = true;
        pending.delete(event.id);
        const decision = event.output;
        const ok = typeof decision === 'object' && decision !== null && 'kind' in decision && decision.kind === 'result';
        const value = ok && 'value' in decision ? decision.value : undefined;
        const status = typeof value === 'object' && value !== null && 'status' in value ? value.status : undefined;
        if (isRead(event.name)) {
          if (event.name === 'get_native_balance' || event.name === 'get_token_balances') {
            const formatted = formatOnblocBalance(event.name, decision);
            if (formatted === undefined) readFailed = true;
            else balances.set(event.name, formatted);
          } else if (ok && (event.name !== ToolName.GetApprovals || status === WalletStatus.Ok)) readSucceeded = true;
          else readFailed = true;
        } else {
          outcomes.push(status === WalletStatus.Prepared ? 'Unsigned transaction prepared. Nothing was sent.'
            : 'Transaction preparation was not confirmed.');
        }
        yield event;
        break;
      }
      case GenerateEventType.ToolError:
        toolAttempted = true;
        pending.delete(event.id);
        if (event.name === ToolName.Transfer || event.name === ToolName.Approve) outcomes.push('Transaction preparation was not confirmed.');
        else readFailed = true;
        yield event;
        break;
      case GenerateEventType.Done: {
        if (event.aborted && outcomes.length === 0) {
          yield event;
          break;
        }
        if (pending.size > 0) readFailed = true;
        const verifiedAnswer = balances.size > 0 && !readFailed && !outcomes.length;
        const explanation = !toolAttempted && !readFailed && text.trim().length > 0;
        const trusted = explanation || ((readSucceeded || verifiedAnswer) && !readFailed && !outcomes.length);
        const lookupFailure = 'Some Onbloc lookups failed. Review the individual tool results.';
        const answer = outcomes.length ? [...outcomes, ...(readFailed ? [lookupFailure] : [])].join(' ')
          : balances.size ? [...balances.values(), ...(readFailed ? [lookupFailure] : [])].join('\n\n')
            : readFailed ? lookupFailure
              : readSucceeded ? text || 'Onbloc returned data; no model summary was produced.'
                : explanation ? text : 'No wallet lookup or answer completed.';
        yield { type: GenerateEventType.Text, delta: answer };
        const done = explanation ? {
          ...event,
          warnings: [...event.warnings, 'No wallet lookup was performed; this is an unverified model explanation.'],
        } : event;
        yield verifiedAnswer ? { ...done, verifiedAnswer: true } : trusted ? done : { ...done, messages: [] };
        break;
      }
      default:
        yield event;
    }
  }
}
