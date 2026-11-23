// Enum-like constants: `ToolName.Transfer` reads like an enum, the derived union
// type accepts plain strings from the model, and nothing extra is emitted.

/** Tools the model may call. Values are the names the model sees. */
export const ToolName = {
  GetBalance: 'get_balance',
  Transfer: 'transfer',
  SignMessage: 'sign_message',
} as const;
export type ToolName = (typeof ToolName)[keyof typeof ToolName];

export const TokenSymbol = {
  Gnot: 'GNOT',
  Gns: 'GNS',
} as const;
export type TokenSymbol = (typeof TokenSymbol)[keyof typeof TokenSymbol];

/** Outcome of a wallet call. */
export const WalletStatus = {
  Ok: 'ok',
  /** Accepted but not executed: the user must approve first. */
  PendingApproval: 'pending_approval',
  Error: 'error',
} as const;
export type WalletStatus = (typeof WalletStatus)[keyof typeof WalletStatus];

/** Why a wallet call was rejected (`status: 'error'`). */
export const WalletErrorCode = {
  UnknownAccount: 'unknown_account',
  InvalidAddress: 'invalid_address',
  InvalidAmount: 'invalid_amount',
  InsufficientBalance: 'insufficient_balance',
  EmptyMessage: 'empty_message',
} as const;
export type WalletErrorCode = (typeof WalletErrorCode)[keyof typeof WalletErrorCode];
