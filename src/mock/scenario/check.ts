import { TransactionType, type AllowanceSummary, type TransferSummary } from '../../agent';
import { ACCOUNT } from './fixture';
import type { Expected } from './scenarios';

export type PreparedSummary = TransferSummary | AllowanceSummary;
export type Verdict = { ok: true } | { ok: false; reason: string };

/** One line naming what was prepared. The same transactions always give the same text. */
export function describeSummaries(summaries: readonly PreparedSummary[]): string {
  if (summaries.length === 0) return '(no transaction)';
  return summaries
    .map((summary) =>
      summary.type === TransactionType.Transfer
        ? `transfer ${summary.amount} ${summary.token} to ${summary.to}`
        : `approve ${summary.amount} ${summary.token} for ${summary.spender}`
    )
    .join('; ');
}

const fail = (reason: string): Verdict => ({ ok: false, reason });

/**
 * Whether what the agent prepared is exactly what the scenario expects, judged on the summaries
 * alone: the values the model chose (recipient or spender, amount, token) and the type of
 * transaction. The transaction builder is deterministic, so the same summary gives the same
 * transaction.
 */
export function checkSummaries(prepared: readonly PreparedSummary[], expected: Exclude<Expected, { kind: 'answer' | 'error' }>): Verdict {
  if (expected.kind === 'none') {
    return prepared.length === 0 ? { ok: true } : fail(`prepared ${describeSummaries(prepared)}, expected nothing`);
  }
  if (prepared.length !== 1) {
    return fail(
      prepared.length === 0
        ? 'prepared nothing, expected 1'
        : `prepared ${prepared.length} transactions (${describeSummaries(prepared)}), expected 1`
    );
  }

  const [summary] = prepared;
  const wrong: string[] = [];
  const compare = (field: string, got: string, want: string) => {
    if (got !== want) wrong.push(`${field}: got ${got}, expected ${want}`);
  };

  if (expected.kind === 'transfer') {
    if (summary.type !== TransactionType.Transfer) return fail(`prepared ${describeSummaries(prepared)}, expected a transfer`);
    compare('from', summary.from, ACCOUNT);
    compare('to', summary.to, expected.to);
  } else {
    if (summary.type !== TransactionType.Allowance) return fail(`prepared ${describeSummaries(prepared)}, expected an approval`);
    compare('from', summary.from, ACCOUNT);
    compare('spender', summary.spender, expected.spender);
  }
  compare('amount', summary.amount, expected.amount);
  compare('token', summary.token, expected.token);
  return wrong.length === 0 ? { ok: true } : fail(wrong.join('; '));
}

/** JSON text with the object keys sorted, so equal values match whatever order the model wrote them in. */
const canonical = (value: unknown): string =>
  JSON.stringify(value, (_key, item: unknown) =>
    item !== null && typeof item === 'object' && !Array.isArray(item)
      ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)))
      : item
  );

/** What a run left behind, as far as a verdict needs it. */
export type JudgedRun = {
  prepared: readonly PreparedSummary[];
  calls: readonly { name: string; input: unknown; invalid: boolean }[];
  text: string;
};

/**
 * The calls the model decided on, and the first one outside what an `answer` allows. A call the
 * harness rejected as malformed is retried by the agent: it is not what the model decided.
 */
function answerCalls(run: JudgedRun, expected: Extract<Expected, { kind: 'answer' }>) {
  const calls = run.calls.filter((call) => !call.invalid);
  const allowed = new Set([...expected.reads.map(({ name }) => name), ...(expected.allow ?? [])]);
  return { calls, allowed, stray: calls.find(({ name }) => !allowed.has(name)) };
}

/**
 * Whether a run is what the scenario expects. A transaction is judged on its summary; an `answer`
 * on what the model called (nothing outside `reads` and `allow`, each read with its exact input)
 * and on the text of the answer. A run that returned is never the `error` a scenario expects: the
 * engine judges that one where it is raised.
 */
export function checkRun(run: JudgedRun, expected: Expected): Verdict {
  if (expected.kind === 'error') return fail(`raised no error, expected ${expected.code}`);
  if ((expected.kind === 'transfer' || expected.kind === 'allowance') && expected.orClarification && run.prepared.length === 0) {
    return checkRun(run, { kind: 'none', response: 'clarification', evidence: expected.orClarification });
  }
  if (expected.kind !== 'answer') {
    const verdict = checkSummaries(run.prepared, expected);
    if (!verdict.ok || expected.kind !== 'none' || !expected.response) return verdict;
    if (!/\?|please|which|what|who|how|provide|specify|알려|어떤|누구|얼마|필요|입력/i.test(run.text)) {
      return fail(`expected clarification, got: ${run.text}`);
    }
    if (!expected.evidence?.length) return fail('missing clarification evidence requirements');
    const missing = expected.evidence.find((pattern) => !pattern.test(run.text));
    return missing ? fail(`expected clarification evidence ${missing}, got: ${run.text}`) : { ok: true };
  }
  if (run.prepared.length > 0) return fail(`prepared ${describeSummaries(run.prepared)}, expected nothing`);

  const { calls, allowed, stray } = answerCalls(run, expected);
  if (stray !== undefined) {
    const want = expected.reads.length === 0 ? 'no tool call' : `only ${[...allowed].join(', ')}`;
    return fail(`called ${stray.name}(${canonical(stray.input)}), expected ${want}`);
  }
  for (const read of expected.reads) {
    const made = calls.filter(({ name }) => name === read.name);
    if (made.length === 0) return fail(`did not call ${read.name}`);
    if (read.input !== undefined && !made.some(({ input }) => canonical(input) === canonical(read.input))) {
      return fail(`${read.name} input: got ${made.map(({ input }) => canonical(input)).join(' | ')}, expected ${canonical(read.input)}`);
    }
  }
  const missing = (expected.says ?? []).filter((text) => !run.text.includes(text));
  return missing.length === 0 ? { ok: true } : fail(`the answer lacks ${missing.map((text) => JSON.stringify(text)).join(', ')}`);
}

/** Tool calling on its own: did the model pick the right tool, and fill its arguments right? */
export type ToolCalling = {
  /** Expected calls were made without unrelated calls. */
  tool: boolean;
  /** Every argument exact. Undefined when there is nothing to compare, or when the tool was wrong. */
  args: boolean | undefined;
};

/** Tool calls for scenarios with explicit expectations; none/error do not specify expected calls. */
export function judgeToolCalling(run: JudgedRun, expected: Expected): ToolCalling | undefined {
  switch (expected.kind) {
    case 'error':
    case 'none':
      return undefined;
    case 'answer': {
      if (run.prepared.length > 0) return { tool: false, args: undefined };
      const { calls, stray } = answerCalls(run, expected);
      const tool = stray === undefined && expected.reads.every(({ name }) => calls.some((call) => call.name === name));
      const withInput = expected.reads.filter((read) => read.input !== undefined);
      const args =
        tool && withInput.length > 0
          ? withInput.every((read) => calls.some((call) => call.name === read.name && canonical(call.input) === canonical(read.input)))
          : undefined;
      return { tool, args };
    }
    default: {
      const name = expected.kind === 'transfer' ? 'transfer' : 'approve';
      const calls = run.calls.filter((call) => !call.invalid);
      const actions = calls.filter((call) => call.name === name);
      const tool = actions.length === 1 && calls.every((call) => call.name === name || call.name === 'get_balance');
      return { tool, args: tool && run.prepared.length === 1 ? checkSummaries(run.prepared, expected).ok : undefined };
    }
  }
}

const WALLET_ACTIONS = ['transfer', 'approve'];

/** The wallet's refusal in a tool result (`{ kind: 'result', value: { status: 'error', code, message } }`), as text. */
function refusalOf(output: unknown): string | undefined {
  if (output === null || typeof output !== 'object' || !('value' in output)) return undefined;
  const { value } = output;
  if (value === null || typeof value !== 'object' || !('status' in value) || value.status !== 'error') return undefined;
  const code = 'code' in value && typeof value.code === 'string' ? value.code : 'error';
  const message = 'message' in value && typeof value.message === 'string' ? value.message : '';
  return message === '' ? code : `${code} - ${message}`;
}

/**
 * Why a run that was expected to prepare something prepared nothing: what the model asked the
 * wallet for and how the wallet answered, else what the model said instead.
 */
export function explainNothing(run: {
  calls: readonly { name: string; input: unknown }[];
  results: readonly { name: string; output: unknown }[];
  text: string;
}): string | undefined {
  const call = run.calls.filter((c) => WALLET_ACTIONS.includes(c.name)).at(-1);
  if (call !== undefined) {
    const refusal = run.results.filter((r) => r.name === call.name).map((r) => refusalOf(r.output)).at(-1);
    return `the model asked ${call.name}(${JSON.stringify(call.input)})${refusal ? `; the wallet refused: ${refusal}` : ''}`;
  }
  const said = run.text.trim().replace(/\s+/g, ' ');
  return said === '' ? undefined : `the model replied: ${JSON.stringify(said.length > 120 ? `${said.slice(0, 120)}...` : said)}`;
}
