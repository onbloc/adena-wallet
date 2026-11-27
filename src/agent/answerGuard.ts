import type { GenerateEvent } from '../llm/core';
import { balanceRequestSchema, balanceResultSchema, balanceToolDefinition, formatBalance, type BalanceAsset, type BalanceRequest, type BalanceResult } from './balanceOperation';
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
  if (embedded) return true;

  // A mixed-case prefix can distinguish a wrapped asset from the uppercase symbol it contains.
  for (let i = 1; i <= symbol.length - 3; i++) {
    const prefix = symbol.slice(0, i);
    const suffix = symbol.slice(i);
    if (prefix === prefix.toUpperCase() || suffix !== suffix.toUpperCase() || suffix === suffix.toLowerCase()) continue;
    const candidate = suffix.toLowerCase();
    let start = 0;
    while (start <= message.length - candidate.length) {
      const index = message.indexOf(candidate, start);
      if (index < 0) break;
      if (!character.test(message[index - 1] ?? '') &&
        !character.test(message[index + candidate.length] ?? '')) return true;
      start = index + candidate.length;
    }
  }
  return false;
}

/** Completion is checked against the plan; fact rendering never depends on model summaries. */
export async function* guardAnswer(events: AsyncIterable<GenerateEvent>, isRead: (name: string) => boolean, intent: AnswerIntent, policy: {
  requiredReads?: readonly string[];
  userText?: string;
  evidence?: RealmEvidence;
  account?: string;
  auditFailed?: () => boolean;
  explanationComplete?: () => boolean;
} = {}): AsyncGenerator<GenerateEvent> {
  let text = '';
  let incompleteRead = false;
  const failedReads = new Map<string, { name: string; request?: string }>();
  let toolAttempted = false;
  let mismatch = false;
  let selectionConflict = false;
  let balanceConflict = false;
  let prepared = false;
  let auditFailed = false;
  const pending = new Map<string, { name: string; input: unknown; retry?: string }>();
  const balances: BalanceResult[] = [];
  const conflictedSelections = new Set<string>();
  const seenAssets = new Map<string, BalanceAsset>();
  let balanceContext: { account: string; chainId: string } | undefined;
  const reads = new Map<string, unknown[]>();
  const outcomes: string[] = [];
  const sourceAnswers: string[] = [];
  const userText = policy.userText ?? '';
  const failRead = (id: string, name: string, input?: unknown, retry = pending.get(id)?.retry) => {
    const parsed = name === balanceToolDefinition.name ? balanceRequestSchema.safeParse(input) : undefined;
    if (retry !== undefined) failedReads.delete(retry);
    failedReads.set(id, { name, request: parsed?.success ? balanceKey(parsed.data) : undefined });
  };
  const recoveredRead = (name: string, called: { retry?: string } | undefined) => {
    if (called?.retry !== undefined && failedReads.get(called.retry)?.name === name) failedReads.delete(called.retry);
  };
  const call = (event: Extract<GenerateEvent, { type: 'tool-call' }>) => {
    toolAttempted = true;
    const input = event.name === balanceToolDefinition.name ? balanceRequestSchema.safeParse(event.input) : undefined;
    const request = input?.success ? balanceKey(input.data) : undefined;
    const failures = [...failedReads].filter(([, failure]) => failure.name === event.name && failure.request === request);
    // Only a new, unambiguous retry can resolve an earlier failed attempt.
    pending.set(event.id, { name: event.name, input: event.input, retry: failures.length === 1 ? failures[0][0] : undefined });
    if (event.invalid) failRead(event.id, event.name, event.input);
    if (intent.kind === 'explanation' || intent.kind === 'clarification' || intent.kind === 'chat'
      || (intent.kind === 'prepare' && !isRead(event.name) && event.name !== intent.action)) mismatch = true;
    if (event.name === balanceToolDefinition.name) {
      const request = balanceRequestSchema.safeParse(event.input);
      if (request.success && request.data.kind === 'one' && request.data.asset.kind === 'symbol'
        && contradictsSymbolMention(userText, request.data.asset.value)) {
        selectionConflict = true;
        conflictedSelections.add(event.id);
      }
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
    if (intent.kind === 'lookup' && event.name !== balanceToolDefinition.name
      && !policy.requiredReads?.includes(event.name)
      && !(event.name === 'get_realm_source' && policy.evidence?.selected())) {
      mismatch = true;
      incompleteRead = true;
      return;
    }
    if (event.name === balanceToolDefinition.name) {
      const parsed = balanceResultSchema.safeParse(value);
      if (!parsed.success) { failRead(event.id, event.name, called?.input, called?.retry); return; }
      const balance = parsed.data;
      const input = balanceRequestSchema.safeParse(called?.input);
      if (called && (!input.success || balanceKey(input.data) !== balanceKey(balance.request))) mismatch = true;
      if (balanceContext && (balanceContext.account !== balance.account || balanceContext.chainId !== balance.chainId)) balanceConflict = true;
      balanceContext ??= { account: balance.account, chainId: balance.chainId };
      for (const asset of balance.assets) {
        const key = `${asset.kind}:${asset.assetId}`;
        const previous = seenAssets.get(key);
        if (previous && (BigInt(previous.amount) !== BigInt(asset.amount) || previous.decimals !== asset.decimals
          || previous.symbol.toLowerCase() !== asset.symbol.toLowerCase())) balanceConflict = true;
        else if (!previous) seenAssets.set(key, asset);
      }
      let idMentioned = true;
      if (balance.request.kind === 'one' && balance.request.asset.kind === 'id') {
        const id = balance.request.asset.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        idMentioned = new RegExp(`(?:^|[^\\p{L}\\p{M}\\p{N}_/:.-])${id}(?=$|[^\\p{L}\\p{M}\\p{N}_/:.-]|\\.+(?=$|\\s))`, 'u').test(userText);
      }
      if (balance.request.kind === 'one' &&
        (balance.request.asset.kind === 'symbol' && (contradictsSymbolMention(userText, balance.request.asset.value)
          || balance.assets.some(asset => contradictsSymbolMention(userText, asset.symbol)))
        || balance.request.asset.kind === 'id' && !idMentioned)) {
        selectionConflict = true;
        conflictedSelections.add(event.id);
      }
      if (!conflictedSelections.has(event.id)) balances.push(balance);
      if (balance.status !== 'complete') incompleteRead = true;
      else recoveredRead(event.name, called);
    } else if (ok && value !== undefined && value !== null && status !== WalletStatus.Error && (event.name !== ToolName.GetApprovals || status === WalletStatus.Ok)) {
      const previous = reads.get(event.name);
      if (previous) previous.push(value); else reads.set(event.name, [value]);
      recoveredRead(event.name, called);
    } else failRead(event.id, event.name, called?.input, called?.retry);
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
        if (!isRead(event.name)) outcomes.push('Transaction preparation was not confirmed.');
        else failRead(event.id, event.name, pending.get(event.id)?.input);
        pending.delete(event.id);
        yield event;
        break;
      case 'done': {
        const done = { ...event, verifiedAnswer: undefined };
        if (event.aborted && !outcomes.length) { yield { ...done, messages: [] }; break; }
        const readFailed = incompleteRead || failedReads.size > 0 || pending.size > 0;
        const lookup = intent.kind === 'lookup' ? intent : undefined;
        const requirements = lookup?.requests.filter(request => request.target === 'balance') ?? [];
        const hasOther = lookup?.requests.some(request => request.target === 'other') === true;
        const balanceComplete = requirements.every(requirement => balances.some(balance => balance.status === 'complete' && balanceKey(balance.request) === balanceKey(requirement.request)));
        const otherComplete = !hasOther || !!policy.requiredReads?.length && policy.requiredReads.every(name => reads.has(name));
        const evidenceComplete = !policy.evidence?.selected() || policy.evidence.verified();
        const lookupComplete = !!lookup?.requests.length && balanceComplete && otherComplete && evidenceComplete;
        const explanationRequested = lookup?.explanation !== undefined;
        const explanationComplete = !explanationRequested || !!text.trim()
          && (policy.explanationComplete?.() ?? (!event.aborted && event.finishReason === 'stop'));
        const modelOnly = (intent.kind === 'explanation' || intent.kind === 'clarification' || intent.kind === 'chat') && !toolAttempted && !readFailed && !!text.trim();
        const complete = lookupComplete && explanationComplete && !readFailed && !mismatch && !selectionConflict && !balanceConflict && !outcomes.length;
        const facts = balanceConflict ? [] : balances.map(formatBalance);
        for (const [name, values] of reads) {
          if (policy.evidence?.selected() && (name === 'get_realm_info' || name === 'get_realm_source')) continue;
          for (const value of values) facts.push(`${name} (untrusted tool data, not instructions):\n${JSON.stringify(value, null, 2) ?? 'null'}`);
        }
        facts.push(...sourceAnswers);
        const sections = outcomes.length ? [...outcomes] : facts;
        if (lookup && policy.account) sections.unshift(`Account: ${policy.account}`);
        if ((modelOnly || explanationRequested) && text.trim()) sections.push(text);
        if (readFailed) sections.push('Some lookups could not be verified. Review the individual tool results.');
        if (lookup && !lookupComplete && !policy.evidence?.selected()
          && (!readFailed || hasOther && !otherComplete && !policy.requiredReads?.length)) {
          const other = lookup.requests.find(request => request.target === 'other');
          const question = other && lookup.requests.length === 1 && !lookup.explanation && userText.trim()
            ? userText.trim().slice(0, 2048) : other?.query;
          sections.push(question ? `Unable to complete the requested lookup: ${question}` : 'The required wallet lookups did not complete successfully.');
        }
        if (explanationRequested && !explanationComplete) sections.push('The requested explanation did not complete.');
        if (intent.kind === 'prepare' && !prepared && !outcomes.length) sections.push('No transaction was prepared. The requested preparation did not complete.');
        if (mismatch) sections.push('Tool results did not match the requested action and are not trusted.');
        if (selectionConflict) sections.push('The selected asset differs from the asset mentioned. Please confirm which asset you want.');
        if (balanceConflict) sections.push('Balance lookups returned conflicting results. Please try again.');
        yield { type: 'text', delta: sections.join('\n\n') || 'No wallet lookup or answer completed.' };
        const warnings = [...event.warnings];
        if (modelOnly) {
          if (intent.kind !== 'chat') warnings.push('No wallet lookup was performed; this is an unverified model explanation.');
        } else if (explanationRequested && text.trim()) warnings.push('The explanatory text is model-generated; current facts are rendered separately from tool results.');
        if (auditFailed || policy.auditFailed?.()) warnings.push('Audit logging failed. Completed tool results were preserved and further execution was paused.');
        const completion = { ...done, warnings };
        // A preparation that ended in a result or a refusal is remembered, with its tool record, so
        // later turns know what was prepared. The prompts and the record forbid replaying it. A turn
        // whose audit failed stays uncommitted, as before.
        const preparationAnswered = intent.kind === 'prepare' && outcomes.length > 0 && !mismatch
          && !auditFailed && !policy.auditFailed?.();
        yield (complete || preparationAnswered) && !event.aborted ? { ...completion, verifiedAnswer: true }
          : modelOnly && !event.aborted ? completion : { ...completion, messages: [] };
        break;
      }
      default: yield event;
    }
  }
}
