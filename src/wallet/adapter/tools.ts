import { tool, type ToolSet } from 'ai';
import { z } from 'zod';

import { SignRequestType, TokenSymbol, ToolName, WalletStatus } from '../constants';
import { WalletError, type SignResult, type WalletSdk } from '../sdk/types';

// The adapter is the only code between the model and the wallet SDK. It calls
// the SDK's public methods and hands the model small results: no keys, no raw
// messages. Schemas stay simple on purpose: they are rendered into the prompt.

export type WalletToolsContext = {
  sdk: WalletSdk;
  /** The account the user acts as. Injected here; the model never chooses it. */
  activeAddress: string;
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

/** Tools bound to one wallet session. */
export function createWalletTools({ sdk, activeAddress }: WalletToolsContext) {
  return {
    // `address` is optional: leaving it out means the user's own account.
    [ToolName.GetBalance]: tool({
      description:
        "Get token balances. Without an address: the user's own account. With an address: that address.",
      inputSchema: z.object({
        address: z
          .string()
          .optional()
          .describe("Address starting with g1. Leave out for the user's own balance"),
      }),
      execute: ({ address }) =>
        refusalsAsResults(async () => {
          // Small models fill optional fields with "": treat a blank address as the user's own.
          const target = address?.trim() || activeAddress;
          return { status: WalletStatus.Ok, address: target, balances: await sdk.getBalance(target) };
        }),
    }),
    [ToolName.Transfer]: tool({
      description:
        "Send tokens from the user's account to a recipient. The user must approve a signing popup; the result says whether it was signed or rejected.",
      inputSchema: z.object({
        to: z.string().describe('Recipient address starting with g1'),
        amount: z.string().describe('Decimal amount as a string, e.g. "0.5"'),
        token: z.enum(TokenSymbol).describe('Token symbol'),
      }),
      execute: ({ to, amount, token }, { abortSignal }) =>
        refusalsAsResults(async () => {
          const message = await sdk.transfer({ from: activeAddress, to, amount, token });
          // The harness, not the model, passes the message on to be signed.
          const result = await sdk.sign(message, { signal: abortSignal });
          return afterSigning(result, { from: message.from, to, amount: message.amount, token });
        }),
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
