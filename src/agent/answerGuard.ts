import { GenerateEventType, type GenerateEvent } from '../llm/core';
import { ToolName, WalletStatus } from './wallet/constants';
import { balanceRequestSchema, balanceResultSchema, formatBalance } from './balanceOperation';

/** Detect an embedded symbol such as GNS in xGNS without interpreting the user's language. */
function contradictsSymbolMention(text: string, symbol: string): boolean {
  const message = text.toLowerCase();
  const value = symbol.toLowerCase();
  const symbolCharacter = /[a-z0-9_]/i;
  let offset = 0;
  let embedded = false;
  while (offset <= message.length - value.length) {
    const index = message.indexOf(value, offset);
    if (index < 0) break;
    const before = message[index - 1] ?? '';
    const after = message[index + value.length] ?? '';
    if (!symbolCharacter.test(before) && !symbolCharacter.test(after)) return false;
    embedded = true;
    offset = index + value.length;
  }
  return embedded;
}

/**
 * Renders wallet outcomes from tool results. Tool-free text is a model explanation, not a
 * verified wallet lookup. Failed/incomplete tool runs cannot become trusted conversation turns.
 */
export async function* guardAnswer(
  events: AsyncIterable<GenerateEvent>,
  isRead: (toolName: string) => boolean,
  balanceToolName?: string,
  userText = '',
  evidence?: { selected(): boolean; answer(): AsyncGenerator<GenerateEvent> }
): AsyncGenerator<GenerateEvent> {
  // Only the last step's text is the answer: earlier steps just announce tool calls.
  let text = '';
  let readSucceeded = false;
  let readFailed = false;
  let toolAttempted = false;
  let selectionConflict = false;
  const outcomes: string[] = [];
  const balances: string[] = [];
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
        if (event.name === balanceToolName && !event.invalid) {
          const request = balanceRequestSchema.safeParse(event.input);
          if (request.success && request.data.kind === 'one' && request.data.asset.kind === 'symbol' &&
            contradictsSymbolMention(userText, request.data.asset.value)) selectionConflict = true;
        }
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
          if (event.name === balanceToolName) {
            const result = balanceResultSchema.safeParse(value);
            if (!result.success) readFailed = true;
            else {
              balances.push(formatBalance(result.data));
              if (result.data.status !== 'complete') readFailed = true;
              const request = result.data.request;
              if (request.kind === 'one' && request.asset.kind === 'id' &&
                !userText.toLowerCase().includes(request.asset.value.toLowerCase()) &&
                result.data.assets.some(asset => contradictsSymbolMention(userText, asset.symbol))) {
                selectionConflict = true;
              }
            }
          } else if (ok && (event.name !== ToolName.GetApprovals || status === WalletStatus.Ok)) readSucceeded = true;
          else readFailed = true;
        } else {
          outcomes.push(status === WalletStatus.Prepared ? 'Unsigned transaction prepared. Nothing was sent.'
            : 'Transaction preparation was not confirmed.');
        }
        yield event;
        if (event.name === 'get_realm_info' && evidence?.selected()) yield* evidence.answer();
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
        const done = { ...event };
        delete done.verifiedAnswer;
        if (event.aborted && outcomes.length === 0) {
          yield { ...done, messages: [] };
          break;
        }
        if (evidence?.selected() && !outcomes.length) {
          yield { ...done, messages: [] };
          break;
        }
        if (pending.size > 0) readFailed = true;
        const verifiedAnswer = balances.length > 0 && !readFailed && !outcomes.length && !event.aborted && !selectionConflict;
        const explanation = !toolAttempted && !readFailed && text.trim().length > 0;
        const trusted = (explanation || readSucceeded || verifiedAnswer) &&
          !readFailed && !outcomes.length && !event.aborted && !selectionConflict;
        const lookupFailure = 'Some lookups could not be verified. Review the individual tool results.';
        const conflict = 'The selected asset differs from the asset mentioned. Please confirm which asset you want.';
        const warnings = [...(readFailed ? [lookupFailure] : []), ...(selectionConflict ? [conflict] : [])];
        const answer = outcomes.length ? [...outcomes, ...warnings].join(' ')
          : balances.length ? [...balances, ...warnings].join('\n\n')
            : warnings.length ? warnings.join(' ')
              : readSucceeded ? text || 'Data was returned; no model summary was produced.'
                : explanation ? text : 'No wallet lookup or answer completed.';
        yield { type: GenerateEventType.Text, delta: answer };
        const completion = explanation ? {
          ...done,
          warnings: [...done.warnings, 'No wallet lookup was performed; this is an unverified model explanation.'],
        } : done;
        yield verifiedAnswer ? { ...completion, verifiedAnswer: true } : trusted ? completion : { ...completion, messages: [] };
        break;
      }
      default:
        yield event;
    }
  }
}
