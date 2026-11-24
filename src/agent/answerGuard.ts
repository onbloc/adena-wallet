import type { GenerateEvent } from '../llm/core';
import { balanceRequestSchema, balanceResultSchema, balanceToolDefinition, formatBalance, type BalanceRequest, type BalanceResult } from './balanceOperation';
import type { RealmEvidence } from './realmEvidence';
import type { RequestIntent } from './requestIntent';
import { ToolName, WalletStatus } from './wallet/constants';

export type AnswerIntent = Exclude<RequestIntent, { kind: 'prepare' }>
  | { kind: 'prepare'; action: 'transfer' | 'approve' };

function balanceKey(request: BalanceRequest): string {
  return request.kind === 'all' ? 'all' : `${request.asset.kind}:${request.asset.kind === 'symbol' ? request.asset.value.toLowerCase() : request.asset.value}`;
}

/** Distinguishes embedded symbols such as GNS in xGNS without interpreting user language. */
function contradictsSymbolMention(text: string, symbol: string): boolean {
  const message = text.toLowerCase();
  const value = symbol.toLowerCase();
  const character = /[a-z0-9_]/i;
  let offset = 0;
  let embedded = false;
  while (offset <= message.length - value.length) {
    const index = message.indexOf(value, offset);
    if (index < 0) break;
    if (!character.test(message[index - 1] ?? '') && !character.test(message[index + value.length] ?? '')) return false;
    embedded = true;
    offset = index + value.length;
  }
  return embedded;
}

/** Completion is checked against the plan; fact rendering never depends on model summaries. */
export async function* guardAnswer(events: AsyncIterable<GenerateEvent>, isRead: (name: string) => boolean, intent: AnswerIntent, policy: {
  requiredReads?: readonly string[];
  userText?: string;
  evidence?: RealmEvidence;
  auditFailed?: () => boolean;
} = {}): AsyncGenerator<GenerateEvent> {
  let text = '';
  let readFailed = false;
  let toolAttempted = false;
  let mismatch = false;
  let selectionConflict = false;
  let prepared = false;
  let auditFailed = false;
  const pending = new Map<string, { name: string; input: unknown }>();
  const balances: BalanceResult[] = [];
  const reads = new Map<string, unknown[]>();
  const outcomes: string[] = [];
  const sourceAnswers: string[] = [];
  const userText = policy.userText ?? '';
  const call = (event: Extract<GenerateEvent, { type: 'tool-call' }>) => {
    toolAttempted = true;
    pending.set(event.id, { name: event.name, input: event.input });
    if (event.invalid) readFailed = true;
    if (intent.kind === 'explanation' || intent.kind === 'clarification' || intent.kind === 'unsupported'
      || (intent.kind === 'prepare' && !isRead(event.name) && event.name !== intent.action)) mismatch = true;
    if (event.name === balanceToolDefinition.name) {
      const request = balanceRequestSchema.safeParse(event.input);
      if (request.success && request.data.kind === 'one' && request.data.asset.kind === 'symbol'
        && contradictsSymbolMention(userText, request.data.asset.value)) selectionConflict = true;
    }
  };
  const result = (event: Extract<GenerateEvent, { type: 'tool-result' }>) => {
    toolAttempted = true;
    const called = pending.get(event.id);
    if (called && called.name !== event.name) mismatch = true;
    pending.delete(event.id);
    const decision = event.output;
    const object = typeof decision === 'object' && decision !== null;
    if (object && 'auditFailed' in decision && decision.auditFailed === true) auditFailed = true;
    const ok = object && 'kind' in decision && decision.kind === 'result';
    const value = ok && 'value' in decision ? decision.value : undefined;
    const status = typeof value === 'object' && value !== null && 'status' in value ? value.status : undefined;
    if (status === WalletStatus.Prepared || !isRead(event.name)) {
      const matched = intent.kind === 'prepare' && intent.action === event.name && (!called || called.name === event.name);
      if (!matched) mismatch = true;
      if (matched && status === WalletStatus.Prepared) prepared = true;
      const message = typeof value === 'object' && value !== null && 'message' in value && typeof value.message === 'string' ? value.message : undefined;
      outcomes.push(status === WalletStatus.Prepared ? 'Unsigned transaction prepared. Nothing was sent.'
        : message ? `Transaction preparation failed: ${message}` : 'Transaction preparation was not confirmed.');
      return;
    }
    if (intent.kind !== 'lookup' && intent.kind !== 'prepare') mismatch = true;
    if (event.name === balanceToolDefinition.name) {
      const parsed = balanceResultSchema.safeParse(value);
      if (!parsed.success) { readFailed = true; return; }
      const balance = parsed.data;
      const input = balanceRequestSchema.safeParse(called?.input);
      if (called && (!input.success || balanceKey(input.data) !== balanceKey(balance.request))) mismatch = true;
      if (balance.request.kind === 'one' && balance.request.asset.kind === 'id'
        && !userText.toLowerCase().includes(balance.request.asset.value.toLowerCase())
        && balance.assets.some(asset => contradictsSymbolMention(userText, asset.symbol))) selectionConflict = true;
      balances.push(balance);
      if (balance.status !== 'complete') readFailed = true;
    } else if (ok && status !== WalletStatus.Error && (event.name !== ToolName.GetApprovals || status === WalletStatus.Ok)) {
      const previous = reads.get(event.name);
      if (previous) previous.push(value); else reads.set(event.name, [value]);
    } else readFailed = true;
  };

  for await (const event of events) {
    switch (event.type) {
      case 'step-start': text = ''; yield event; break;
      case 'text': text += event.delta; break;
      case 'tool-call': call(event); yield event; break;
      case 'tool-result':
        result(event);
        yield event;
        if (event.name === 'get_realm_info' && policy.evidence?.selected()) {
          for await (const source of policy.evidence.answer()) {
            if (source.type === 'text') sourceAnswers.push(source.delta);
            else {
              if (source.type === 'tool-call') call(source);
              else if (source.type === 'tool-result') result(source);
              yield source;
            }
          }
        }
        break;
      case 'tool-error':
        toolAttempted = true;
        if (pending.has(event.id) && pending.get(event.id)?.name !== event.name) mismatch = true;
        pending.delete(event.id);
        if (!isRead(event.name)) outcomes.push('Transaction preparation was not confirmed.'); else readFailed = true;
        yield event;
        break;
      case 'done': {
        const done = { ...event, verifiedAnswer: undefined };
        if (event.aborted && !outcomes.length) { yield { ...done, messages: [] }; break; }
        if (pending.size) readFailed = true;
        const lookup = intent.kind === 'lookup' ? intent : undefined;
        const requirements = lookup?.requests.filter(request => request.target === 'balance') ?? [];
        const hasOther = lookup?.requests.some(request => request.target === 'other') === true;
        const balanceComplete = requirements.every(requirement => balances.some(balance => balance.status === 'complete' && balanceKey(balance.request) === balanceKey(requirement.request)));
        const otherComplete = !hasOther || !!policy.requiredReads?.length && policy.requiredReads.every(name => reads.has(name));
        const evidenceComplete = !policy.evidence?.selected() || policy.evidence.verified();
        const lookupComplete = !!lookup?.requests.length && balanceComplete && otherComplete && evidenceComplete;
        const explanationRequested = lookup?.explanation !== undefined;
        const explanationComplete = !explanationRequested || !!text.trim();
        const modelOnly = (intent.kind === 'explanation' || intent.kind === 'clarification') && !toolAttempted && !readFailed && !!text.trim();
        const complete = lookupComplete && explanationComplete && !readFailed && !mismatch && !selectionConflict && !outcomes.length;
        const facts = balances.map(formatBalance);
        for (const [name, values] of reads) {
          if (policy.evidence?.selected() && (name === 'get_realm_info' || name === 'get_realm_source')) continue;
          for (const value of values) facts.push(`${name}:\n${JSON.stringify(value, null, 2) ?? 'null'}`);
        }
        facts.push(...sourceAnswers);
        const sections = outcomes.length ? [...outcomes] : facts;
        if ((modelOnly || explanationRequested) && text.trim()) sections.push(text);
        if (readFailed) sections.push('Some lookups could not be verified. Review the individual tool results.');
        else if (lookup && !lookupComplete && !policy.evidence?.selected()) sections.push('The required wallet lookups did not complete successfully.');
        if (explanationRequested && !explanationComplete) sections.push('The requested explanation did not complete.');
        if (intent.kind === 'prepare' && !prepared && !outcomes.length) sections.push('No transaction was prepared. The requested preparation did not complete.');
        if (mismatch) sections.push('Tool results did not match the requested action and are not trusted.');
        if (selectionConflict) sections.push('The selected asset differs from the asset mentioned. Please confirm which asset you want.');
        yield { type: 'text', delta: sections.join('\n\n') || 'No wallet lookup or answer completed.' };
        const warnings = [...event.warnings];
        if (modelOnly) warnings.push('No wallet lookup was performed; this is an unverified model explanation.');
        else if (explanationRequested && text.trim()) warnings.push('The explanatory text is model-generated; current facts are rendered separately from tool results.');
        if (auditFailed || policy.auditFailed?.()) warnings.push('Audit logging failed. Completed tool results were preserved and further execution was paused.');
        const completion = { ...done, warnings };
        yield complete && !event.aborted ? { ...completion, verifiedAnswer: true }
          : modelOnly && !event.aborted ? completion : { ...completion, messages: [] };
        break;
      }
      default: yield event;
    }
  }
}
