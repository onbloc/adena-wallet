import { tool, type ToolSet } from 'ai';
import { z } from 'zod';

import { ToolName, TokenSymbol } from './constants';
import type { MockWallet } from './mockWallet';

// Schemas stay simple on purpose: they are rendered into the model's prompt.
// Value checks (address format, balance, ...) live in MockWallet.
const token = z.enum(TokenSymbol).describe('Token symbol');
const account = z
  .number()
  .int()
  .optional()
  .describe('Account number starting at 1. Omit to use Account 1.');

/** Tools bound to one wallet; `execute` calls the mock wallet directly. */
export function createWalletTools(wallet: MockWallet) {
  return {
    [ToolName.GetBalance]: tool({
      description: 'Get the balance of one token in one account.',
      inputSchema: z.object({ token, account }),
      execute: (args) => wallet.getBalance(args),
    }),
    [ToolName.Transfer]: tool({
      description:
        'Send tokens to a recipient address. Requires user approval before it is sent.',
      inputSchema: z.object({
        to: z.string().describe('Recipient address starting with g1'),
        amount: z.string().describe('Decimal amount as a string, e.g. "0.5"'),
        token,
        account,
      }),
      execute: (args) => wallet.transfer(args),
    }),
    [ToolName.SignMessage]: tool({
      description: 'Sign a message with an account. Requires user approval.',
      inputSchema: z.object({
        message: z.string().describe('The message to sign'),
        account,
      }),
      execute: (args) => wallet.signMessage(args),
    }),
  } satisfies ToolSet;
}
