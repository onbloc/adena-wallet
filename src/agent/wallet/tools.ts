import { z } from 'zod';

import { ToolName, WalletStatus } from './constants';
import { WalletError, type Contact, type TransactionHandler, type WalletSdk } from './port';
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
  /** Gets every transaction a tool prepares; the app signs it. The model never sees it. */
  onTransaction: TransactionHandler;
};

export type ToolResult = { status: WalletStatus; [key: string]: unknown };

const PREPARED_MESSAGE = 'The transaction is ready. The user signs it in their wallet; nothing was sent.';

/** Wallet refusals become results the model can read; anything else is a real failure. */
async function refusalsAsResults(run: () => Promise<ToolResult>): Promise<ToolResult> {
  try {
    return await run();
  } catch (error) {
    if (!(error instanceof WalletError)) throw error;
    return { status: WalletStatus.Error, code: error.code, message: error.message };
  }
}

function walletTool<Schema extends z.ZodType>({ name, effect, description, schema, run }: {
  name: string;
  effect: WalletTool['effect'];
  description: string;
  schema: Schema;
  run(input: z.infer<Schema>): Promise<ToolResult>;
}): WalletTool {
  return {
    definition: { name, description, inputSchema: schema },
    effect,
    async execute(raw, signal) {
      if (signal.aborted) return { kind: 'denied', code: 'CANCELLED' };
      const parsed = schema.safeParse(raw);
      if (!parsed.success) return { kind: 'denied', code: 'INVALID_INPUT' };
      if (signal.aborted) return { kind: 'denied', code: 'CANCELLED' };
      return { kind: 'result', value: await refusalsAsResults(() => run(parsed.data)) };
    },
  };
}

/** A contact's name (any case) becomes its address; anything else is left for the SDK to check. */
const resolveContact = (contacts: readonly Contact[], recipient: string) =>
  contacts.find((contact) => contact.alias.toLowerCase() === recipient.trim().toLowerCase())?.address ??
  recipient;

/**
 * Tools bound to one wallet session. They prepare transactions through the wallet and hand each
 * to `onTransaction`; balances are read through the tool sources, so the model never has two
 * sources for the same fact. `approve` and `get_approvals` are offered only if the wallet
 * implements them.
 */
export function createWalletTools({ sdk, account, contacts, onTransaction }: WalletToolsContext): Record<string, WalletTool> {
  const approve = sdk.approve?.bind(sdk);
  const getAllowances = sdk.getAllowances?.bind(sdk);
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
      run: async ({ to, amount, token }) => {
        const prepared = await sdk.transfer({
          from: account,
          to: resolveContact(contacts, to),
          amount,
          token,
        });
        await onTransaction(prepared);
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
        run: async ({ spender, amount, token }) => {
          const prepared = await approve({
            from: account,
            spender: resolveContact(contacts, spender),
            amount,
            token,
          });
          await onTransaction(prepared);
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
