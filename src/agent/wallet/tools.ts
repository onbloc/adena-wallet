import { tool, type ToolSet } from 'ai';
import { z } from 'zod';

import { SignRequestType, TokenSymbol, ToolName, WalletStatus } from './constants';
import { WalletError, type Contact, type SignResult, type WalletSdk } from './port';

// The adapter is the only code between the model and the wallet SDK. It calls
// the SDK's public methods and hands the model small results: no keys, no raw
// messages. Schemas stay simple on purpose: they are rendered into the prompt.

export type WalletToolsContext = {
  sdk: WalletSdk;
  /** The account the user acts as. Injected here; the model never chooses it. */
  activeAddress: string;
  /** Address book: the model may name a contact instead of writing its address. */
  contacts: readonly Contact[];
};

export type ToolResult = { status: WalletStatus; [key: string]: unknown };

const REJECTED: ToolResult = {
  status: WalletStatus.Rejected,
  message: 'The user rejected the signing request.',
};

/** Wallet refusals become results the model can read; anything else is a real failure. */
async function refusalsAsResults(run: () => Promise<ToolResult>): Promise<ToolResult> {
  try {
    return await run();
  } catch (error) {
    if (!(error instanceof WalletError)) throw error;
    return { status: WalletStatus.Error, code: error.code, message: error.message };
  }
}

const afterSigning = (result: SignResult, signed: Omit<ToolResult, 'status'> = {}): ToolResult =>
  result.status === WalletStatus.Signed ? { status: WalletStatus.Signed, ...signed } : REJECTED;

/** A contact's name (any case) becomes its address; anything else is left for the SDK to check. */
const resolveContact = (contacts: readonly Contact[], recipient: string) =>
  contacts.find((contact) => contact.alias.toLowerCase() === recipient.trim().toLowerCase())?.address ??
  recipient;

/**
 * Tools bound to one wallet session. They act on the mock wallet; balances are read through
 * the Onbloc MCP, so the model never has two sources for the same fact.
 */
export function createWalletTools({ sdk, activeAddress, contacts }: WalletToolsContext) {
  return {
    [ToolName.Transfer]: tool({
      description:
        "Send tokens from the user's account to a recipient. The user must approve a signing popup; the result says whether it was signed or rejected.",
      inputSchema: z.object({
        to: z.string().describe('Recipient: a g1... address, or a contact name'),
        amount: z.string().describe('Decimal amount as a string, e.g. "0.5"'),
        token: z.enum(TokenSymbol).describe('Token symbol'),
      }),
      execute: ({ to, amount, token }, { abortSignal }) =>
        refusalsAsResults(async () => {
          const message = await sdk.transfer({
            from: activeAddress,
            to: resolveContact(contacts, to),
            amount,
            token,
          });
          // The harness, not the model, passes the message on to be signed.
          const result = await sdk.sign(message, { signal: abortSignal });
          return afterSigning(result, {
            from: message.from,
            to: message.to,
            amount: message.amount,
            token,
          });
        }),
    }),
    [ToolName.Approve]: tool({
      description:
        "Let another address (the spender) use up to an amount of one of the user's tokens (a token approval or allowance). A new approval for the same spender and token replaces the old one. The user must approve a signing popup; the result says whether it was signed or rejected.",
      inputSchema: z.object({
        spender: z.string().describe('Spender: a g1... address, or a contact name'),
        amount: z.string().describe('Decimal amount as a string, e.g. "10"'),
        token: z.enum(TokenSymbol).describe('Token symbol'),
      }),
      execute: ({ spender, amount, token }, { abortSignal }) =>
        refusalsAsResults(async () => {
          const message = await sdk.approve({
            from: activeAddress,
            spender: resolveContact(contacts, spender),
            amount,
            token,
          });
          // The harness, not the model, passes the message on to be signed.
          const result = await sdk.sign(message, { signal: abortSignal });
          return afterSigning(result, {
            from: message.from,
            spender: message.spender,
            amount: message.amount,
            token,
          });
        }),
    }),
    [ToolName.GetApprovals]: tool({
      description: 'List the token approvals the user has given to other addresses.',
      inputSchema: z.object({}),
      execute: () =>
        refusalsAsResults(async () => ({
          status: WalletStatus.Ok,
          address: activeAddress,
          approvals: await sdk.getAllowances(activeAddress),
        })),
    }),
    [ToolName.SignMessage]: tool({
      description:
        "Sign a text message with the user's account. The user must approve a signing popup.",
      inputSchema: z.object({ message: z.string().describe('The text to sign') }),
      execute: ({ message }, { abortSignal }) =>
        refusalsAsResults(async () =>
          afterSigning(
            await sdk.sign(
              { type: SignRequestType.Message, signer: activeAddress, text: message },
              { signal: abortSignal }
            )
          )
        ),
    }),
  } satisfies ToolSet;
}
