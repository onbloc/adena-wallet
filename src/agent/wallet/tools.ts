import { z } from 'zod';

import { ToolName, WalletStatus } from './constants';
import { WalletError, type Contact, type PreparedTransaction, type TransactionHandler, type WalletSdk } from './port';
import type { WalletTool } from '../../harness/core';

// The adapter is the only code between the model and the wallet SDK. It calls
// the SDK's public methods and hands the model small results: no keys, no raw
// transactions. Schemas stay simple on purpose: they are rendered into the prompt.

export type WalletToolsContext = {
  sdk: WalletSdk;
  /** The user's address. Injected here as `from`; the model never chooses it. */
  account: string;
  /** Address book: the model may name a contact instead of writing its address. */
  contacts: readonly Contact[];
  /** The current user request, not model-generated content or conversation history. */
  userText: string;
  /** Gets every transaction a tool prepares; the app signs it. The model never sees it. */
  onTransaction: TransactionHandler;
};

export type ToolResult = { status: WalletStatus; [key: string]: unknown };

const PREPARED_MESSAGE = 'The transaction is ready. The user signs it in their wallet; nothing was sent.';

/** Wallet refusals become results the model can read; anything else is a real failure. */
async function refusalsAsResults(run: () => Promise<ToolResult | undefined>): Promise<ToolResult | undefined> {
  try {
    return await run();
  } catch (error) {
    if (!(error instanceof WalletError)) throw error;
    return { status: WalletStatus.Error, code: error.code, message: error.message };
  }
}

function walletTool<Schema extends z.ZodType>({ name, effect, description, schema, authorize, run }: {
  name: string;
  effect: WalletTool['effect'];
  description: string;
  schema: Schema;
  authorize?(input: z.infer<Schema>): boolean;
  run(input: z.infer<Schema>, signal: AbortSignal, cancelled: () => boolean): Promise<ToolResult | undefined>;
}): WalletTool {
  return {
    definition: { name, description, inputSchema: schema },
    effect,
    async execute(raw, signal, deadline) {
      const cancelled = () => signal.aborted || (deadline !== undefined && Date.now() >= deadline);
      if (cancelled()) return { kind: 'denied', code: 'CANCELLED' };
      const parsed = schema.safeParse(raw);
      if (!parsed.success) return { kind: 'denied', code: 'INVALID_INPUT' };
      if (cancelled()) return { kind: 'denied', code: 'CANCELLED' };
      if (authorize && !authorize(parsed.data)) return { kind: 'denied', code: 'TARGET_CHANGED' };
      const value = await refusalsAsResults(() => run(parsed.data, signal, cancelled));
      return value === undefined ? { kind: 'denied', code: 'CANCELLED' } : { kind: 'result', value };
    },
  };
}

/** A contact's name (any case) becomes its address; anything else is left for the SDK to check. */
const resolveContact = (contacts: readonly Contact[], recipient: string) =>
  contacts.find((contact) => contact.alias.toLowerCase() === recipient.trim().toLowerCase())?.address ??
  recipient;

function mentions(text: string, value: string): boolean {
  const needle = value.trim().toLowerCase();
  if (!needle) return false;
  const word = /[\p{L}\p{M}\p{N}_]/u;
  for (let index = text.indexOf(needle); index !== -1; index = text.indexOf(needle, index + 1)) {
    const previousIndex = index > 1 && text.charCodeAt(index - 1) >= 0xdc00 && text.charCodeAt(index - 1) <= 0xdfff
      ? index - 2 : index - 1;
    const before = index === 0 ? '' : String.fromCodePoint(text.codePointAt(previousIndex)!);
    const afterIndex = index + needle.length;
    const after = afterIndex === text.length ? '' : String.fromCodePoint(text.codePointAt(afterIndex)!);
    if (!word.test(before) && !word.test(after)) return true;
  }
  return false;
}

/**
 * Tools bound to one wallet session. They prepare transactions through the wallet and hand each
 * to `onTransaction`; balances are read through the tool sources, so the model never has two
 * sources for the same fact. `approve` and `get_approvals` are offered only if the wallet
 * implements them.
 */
export function createWalletTools({ sdk, account, contacts, userText, onTransaction }: WalletToolsContext): Record<string, WalletTool> {
  const approve = sdk.approve?.bind(sdk);
  const getAllowances = sdk.getAllowances?.bind(sdk);
  const text = userText.toLowerCase();
  const authorized = (target: string) => {
    const alias = target.trim().toLowerCase();
    const resolved = resolveContact(contacts, target).trim().toLowerCase();
    const named = contacts.filter(contact => contact.alias.trim().toLowerCase() === alias);
    if (named.some(contact => contact.address.trim().toLowerCase() !== resolved)) return false;
    if (mentions(text, target) || mentions(text, resolved)) return true;
    return contacts.some(contact => contact.address.trim().toLowerCase() === resolved &&
      contacts.every(other => other.alias.trim().toLowerCase() !== contact.alias.trim().toLowerCase() ||
        other.address.trim().toLowerCase() === resolved) && mentions(text, contact.alias));
  };
  async function handoff<T extends PreparedTransaction>(prepare: () => Promise<T>, signal: AbortSignal, cancelled: () => boolean) {
    if (cancelled()) return undefined;
    // React Native can supply a Promise implementation without withResolvers.
    let onAbort: (() => void) | undefined;
    const aborted = new Promise<undefined>(resolve => {
      onAbort = () => resolve(undefined);
      signal.addEventListener('abort', onAbort, { once: true });
    });
    let prepared: T | undefined;
    try {
      prepared = await Promise.race([prepare(), aborted]);
    } catch (error) {
      if (cancelled()) return undefined;
      throw error;
    } finally {
      if (onAbort) signal.removeEventListener('abort', onAbort);
    }
    if (!prepared || cancelled()) return undefined;
    await onTransaction(prepared);
    return prepared;
  }
  return {
    [ToolName.Transfer]: walletTool({
      name: ToolName.Transfer,
      effect: 'prepare',
      description:
        "Prepare a transfer of tokens from the user's account to a recipient. Nothing is sent: the user signs the transaction in their wallet.",
      schema: z.object({
        to: z.string().describe('Recipient: a g1... address, or a contact name'),
        amount: z.string().describe('Decimal amount as a string, e.g. "0.5"'),
        token: z.string().describe('Token symbol, e.g. GNOT'),
      }),
      authorize: ({ to }) => authorized(to),
      run: async ({ to, amount, token }, signal, cancelled) => {
        const prepared = await handoff(() => sdk.transfer({
          from: account,
          to: resolveContact(contacts, to),
          amount,
          token,
        }), signal, cancelled);
        if (!prepared) return undefined;
        const { summary } = prepared;
        return {
          status: WalletStatus.Prepared,
          from: summary.from,
          to: summary.to,
          amount: summary.amount,
          token: summary.token,
          message: PREPARED_MESSAGE,
        };
      },
    }),
    ...(approve && {
      [ToolName.Approve]: walletTool({
        name: ToolName.Approve,
        effect: 'prepare',
        description:
          "Prepare a token approval (allowance): let another address (the spender) use up to an amount of one of the user's tokens. A new approval for the same spender and token replaces the old one. Nothing is sent: the user signs the transaction in their wallet.",
        schema: z.object({
          spender: z.string().describe('Spender: a g1... address, or a contact name'),
          amount: z.string().describe('Decimal amount as a string, e.g. "10"'),
          token: z.string().describe('Token symbol, e.g. GNOT'),
        }),
        authorize: ({ spender }) => authorized(spender),
        run: async ({ spender, amount, token }, signal, cancelled) => {
          const prepared = await handoff(() => approve({
            from: account,
            spender: resolveContact(contacts, spender),
            amount,
            token,
          }), signal, cancelled);
          if (!prepared) return undefined;
          const { summary } = prepared;
          return {
            status: WalletStatus.Prepared,
            from: summary.from,
            spender: summary.spender,
            amount: summary.amount,
            token: summary.token,
            message: PREPARED_MESSAGE,
          };
        },
      }),
    }),
    ...(getAllowances && {
      [ToolName.GetApprovals]: walletTool({
        name: ToolName.GetApprovals,
        effect: 'read',
        description: 'List the token approvals the user has given to other addresses.',
        schema: z.object({}),
        run: async () => ({
          status: WalletStatus.Ok,
          address: account,
          approvals: await getAllowances(account),
        }),
      }),
    }),
  } satisfies Record<string, WalletTool>;
}
