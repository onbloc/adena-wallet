// Enum-like constants: `ToolName.Transfer` reads like an enum, the derived union
// type accepts plain strings from the model, and nothing extra is emitted.

/** Tools the model may call. Values are the names the model sees. */
export const ToolName = {
  GetBalance: 'get_balance',
  GetAddressBalance: 'get_address_balance',
  Transfer: 'transfer',
  SignMessage: 'sign_message',
} as const;
export type ToolName = (typeof ToolName)[keyof typeof ToolName];

export const TokenSymbol = {
  Gnot: 'GNOT',
  Gns: 'GNS',
} as const;
export type TokenSymbol = (typeof TokenSymbol)[keyof typeof TokenSymbol];

/** Outcome of a wallet-facing call as the model sees it. */
export const WalletStatus = {
  Ok: 'ok',
  /** The user approved the signing popup. */
  Signed: 'signed',
  /** The user rejected the signing popup. */
  Rejected: 'rejected',
  Error: 'error',
} as const;
export type WalletStatus = (typeof WalletStatus)[keyof typeof WalletStatus];

/** Why the wallet refused a call (`status: 'error'`). */
export const WalletErrorCode = {
  /** `from` / `signer` is not an account of this wallet. */
  UnknownAccount: 'unknown_account',
  InvalidAddress: 'invalid_address',
  InvalidAmount: 'invalid_amount',
  InsufficientBalance: 'insufficient_balance',
  EmptyMessage: 'empty_message',
  /** The message to sign was not created by this wallet, or was altered. */
  InvalidMessage: 'invalid_message',
  /** The transfer message was already signed and applied. */
  AlreadyApplied: 'already_applied',
} as const;
export type WalletErrorCode = (typeof WalletErrorCode)[keyof typeof WalletErrorCode];

/** What the wallet asks the user to sign. */
export const SignRequestType = {
  Transfer: 'transfer',
  Message: 'message',
} as const;
export type SignRequestType = (typeof SignRequestType)[keyof typeof SignRequestType];

/** What the (simulated) user does at the signing popup. */
export const ApprovalPolicy = {
  Approve: 'approve',
  Reject: 'reject',
} as const;
export type ApprovalPolicy = (typeof ApprovalPolicy)[keyof typeof ApprovalPolicy];
