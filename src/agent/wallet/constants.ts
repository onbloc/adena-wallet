// Enum-like constants: `ToolName.Transfer` reads like an enum, the derived union
// type accepts plain strings from the model, and nothing extra is emitted.

/** Wallet tools the model may call. Values are the names the model sees. */
export const ToolName = {
  Transfer: 'transfer',
  Approve: 'approve',
  GetApprovals: 'get_approvals',
} as const;
export type ToolName = (typeof ToolName)[keyof typeof ToolName];

/** Outcome of a wallet-facing call as the model sees it. */
export const WalletStatus = {
  Ok: 'ok',
  /** The transaction was built and handed to the app. Nothing was signed or sent. */
  Prepared: 'prepared',
  Error: 'error',
} as const;
export type WalletStatus = (typeof WalletStatus)[keyof typeof WalletStatus];

/** Why the wallet refused a call (`status: 'error'`). */
export const WalletErrorCode = {
  InvalidAddress: 'invalid_address',
  InvalidAmount: 'invalid_amount',
  /** No token with this symbol (or package path) in the wallet. */
  UnknownToken: 'unknown_token',
  /** Several tokens share this symbol; the message lists their package paths. */
  AmbiguousToken: 'ambiguous_token',
  /** The token cannot do this, e.g. an allowance for the native token. */
  UnsupportedToken: 'unsupported_token',
  /** The wallet app failed or refused for a reason of its own; the message says why. */
  WalletFailed: 'wallet_failed',
  InsufficientBalance: 'insufficient_balance',
} as const;
export type WalletErrorCode = (typeof WalletErrorCode)[keyof typeof WalletErrorCode];

/** What a prepared transaction does. */
export const TransactionType = {
  Transfer: 'transfer',
  /** A token allowance: the owner lets a spender use an amount of one token. */
  Allowance: 'allowance',
} as const;
export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType];
