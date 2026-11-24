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
export function checkSummaries(prepared: readonly PreparedSummary[], expected: Expected): Verdict {
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
