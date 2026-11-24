import { GenerateEventType, type GenerateEvent } from '../llm/core';
import { ToolName, WalletStatus } from './wallet/constants';
import { formatOnblocBalance } from './onblocBalances';
import type { RequestIntent } from './requestIntent';

/**
 * Renders wallet outcomes from tool results. Tool-free text is a model explanation, not a
 * verified wallet lookup. Failed/incomplete tool runs cannot become trusted conversation turns.
 */
export async function* guardAnswer(
  events: AsyncIterable<GenerateEvent>,
  isRead: (toolName: string) => boolean,
  intent: RequestIntent
): AsyncGenerator<GenerateEvent> {
  // Only the last step's text is the answer: earlier steps just announce tool calls.
  let text = '';
  let readSucceeded = false;
  let readFailed = false;
  let toolAttempted = false;
  const outcomes: string[] = [];
  const balances = new Map<string, string>();
  const pending = new Map<string, string>();
  let intentMismatch = false;
  let preparationMatched = false;

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
        pending.set(event.id, event.name);
        if (event.invalid) readFailed = true;
        if ((intent.kind === 'prepare' && !isRead(event.name) && event.name !== intent.action)
          || intent.kind === 'explanation' || intent.kind === 'clarification' || intent.kind === 'unsupported') intentMismatch = true;
        yield event;
        break;
      case GenerateEventType.ToolResult: {
        toolAttempted = true;
        const calledName = pending.get(event.id);
        if (calledName !== undefined && calledName !== event.name) intentMismatch = true;
        pending.delete(event.id);
        const decision = event.output;
        const ok = typeof decision === 'object' && decision !== null && 'kind' in decision && decision.kind === 'result';
        const value = ok && 'value' in decision ? decision.value : undefined;
        const status = typeof value === 'object' && value !== null && 'status' in value ? value.status : undefined;
        if (status === WalletStatus.Prepared || !isRead(event.name)) {
          const matches = intent.kind === 'prepare' && event.name === intent.action
            && (calledName === undefined || calledName === event.name);
          if (!matches) intentMismatch = true;
          if (status === WalletStatus.Prepared && matches) preparationMatched = true;
          outcomes.push(status === WalletStatus.Prepared ? 'Unsigned transaction prepared. Nothing was sent.'
            : 'Transaction preparation was not confirmed.');
        } else if (isRead(event.name)) {
          if (intent.kind !== 'lookup' && intent.kind !== 'prepare') intentMismatch = true;
          if (event.name === 'get_native_balance' || event.name === 'get_token_balances') {
            const formatted = formatOnblocBalance(event.name, decision,
              intent.kind === 'lookup' && intent.target === 'token_balances' ? intent.token : undefined);
            if (formatted === undefined) readFailed = true;
            else balances.set(event.name, formatted);
          } else if (ok && status !== WalletStatus.Error
            && (event.name !== ToolName.GetApprovals || status === WalletStatus.Ok)) readSucceeded = true;
          else readFailed = true;
        }
        yield event;
        break;
      }
      case GenerateEventType.ToolError:
        toolAttempted = true;
        if (pending.has(event.id) && pending.get(event.id) !== event.name) intentMismatch = true;
        if (!isRead(event.name) && (intent.kind !== 'prepare' || event.name !== intent.action)) intentMismatch = true;
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
        const lookupSatisfied = intent.kind === 'lookup' && (
          intent.target === 'native_balance' ? balances.has('get_native_balance')
            : intent.target === 'token_balances' ? balances.has('get_token_balances')
              : intent.target === 'portfolio' ? balances.has('get_native_balance') && balances.has('get_token_balances')
                : readSucceeded || balances.size > 0);
        const verifiedAnswer = lookupSatisfied && balances.size > 0 && !readFailed && !intentMismatch && !outcomes.length;
        const explanation = (intent.kind === 'explanation' || intent.kind === 'clarification')
          && !toolAttempted && !readFailed && text.trim().length > 0;
        const trusted = !event.aborted && (explanation
          || (lookupSatisfied && !readFailed && !intentMismatch && !outcomes.length));
        const lookupFailure = 'Some Onbloc lookups failed. Review the individual tool results.';
        const notices: string[] = [];
        if (readFailed) notices.push(lookupFailure);
        if (intent.kind === 'lookup' && !lookupSatisfied && !readFailed) notices.push('The required wallet lookup did not complete successfully.');
        if (intent.kind === 'prepare' && !preparationMatched && !outcomes.length) notices.push('No transaction was prepared. The requested preparation did not complete.');
        if (intentMismatch) notices.push('Tool results did not match the requested action and are not trusted.');
        const answer = outcomes.length ? [...outcomes, ...notices].join(' ')
          : balances.size ? [...balances.values(), ...notices].join('\n\n')
            : notices.length ? notices.join(' ')
              : lookupSatisfied ? text || 'Onbloc returned data; no model summary was produced.'
                : explanation ? text : 'No wallet lookup or answer completed.';
        yield { type: GenerateEventType.Text, delta: answer };
        const done = {
          ...event,
          verifiedAnswer: undefined,
          ...(explanation ? {
            warnings: [...event.warnings, 'No wallet lookup was performed; this is an unverified model explanation.'],
          } : {}),
        };
        yield verifiedAnswer && !event.aborted ? { ...done, verifiedAnswer: true } : trusted ? done : { ...done, messages: [] };
        break;
      }
      default:
        yield event;
    }
  }
}
