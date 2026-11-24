import { TransactionType, WalletErrorCode } from './constants';

export type TransferParams = {
  from: string;
  to: string;
  /** Decimal string, e.g. "0.5". */
  amount: string;
  /** A token symbol (any case) or package path; the wallet resolves it. */
  token: string;
};

/** Lets `spender` use up to `amount` of the owner's `token`. */
export type AllowanceParams = {
  /** The owner: the account that gives the allowance. */
  from: string;
  spender: string;
  /** Decimal string, e.g. "10". */
  amount: string;
  /** A token symbol (any case) or package path; the wallet resolves it. */
  token: string;
};

/** A transfer as the wallet resolved it: canonical token symbol and amount, lowercase addresses. */
export type TransferSummary = TransferParams & {
  type: typeof TransactionType.Transfer;
  chainId: string;
};

/** An allowance as the wallet resolved it. */
export type AllowanceSummary = AllowanceParams & {
  type: typeof TransactionType.Allowance;
  chainId: string;
};

/**
 * A transaction the wallet built. Nothing here is signed or sent: the app signs it. `summary` is
 * what the model and the user are told; `tx` is the wallet SDK's own transaction object, passed
 * on untouched (the model never sees it).
 */
export type PreparedTransaction<Summary = TransferSummary | AllowanceSummary> = {
  summary: Summary;
  tx: unknown;
};

/** Receives each transaction the agent's tools prepare. */
export type TransactionHandler = (prepared: PreparedTransaction) => void | Promise<void>;

/** One allowance an account has given. */
export type Allowance = { spender: string; token: string; amount: string };

/** A named address the user can send to. */
export type Contact = { alias: string; address: string };

/** A refusal the caller can show to the model or the user. */
export class WalletError extends Error {
  constructor(
    readonly code: WalletErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'WalletError';
  }
}

/**
 * What the agent needs to build transactions. A wallet app implements this over its own SDK.
 * It only builds transactions from the arguments it is given: it never signs, sends, or hands
 * out a private key. Optional methods are optional features: a tool is offered to the model only
 * if the wallet implements its method.
 */
export interface WalletSdk {
  /** The user's address book. The model may name a contact instead of writing its address. */
  getContacts?(): Promise<Contact[]>;
  /** Builds a transfer. Signs and sends nothing. */
  transfer(params: TransferParams): Promise<PreparedTransaction<TransferSummary>>;
  /** Builds a token allowance. Signs and sends nothing. */
  approve?(params: AllowanceParams): Promise<PreparedTransaction<AllowanceSummary>>;
  /** The allowances an account has given, oldest first. */
  getAllowances?(owner: string): Promise<Allowance[]>;
}
