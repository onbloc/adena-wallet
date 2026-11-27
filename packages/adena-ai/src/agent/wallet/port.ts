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
  /** Resolved GRC20 realm, absent for native assets. */
  packagePath?: string;
};

/** An allowance as the wallet resolved it. */
export type AllowanceSummary = AllowanceParams & {
  type: typeof TransactionType.Allowance;
  chainId: string;
  /** Resolved GRC20 realm, absent for native assets. */
  packagePath?: string;
};

/**
 * A transaction the host prepared. `summary` describes the action; `tx` is a host-defined payload
 * passed through untouched. No wallet SDK or transaction encoding is required, and the model
 * never sees `tx`. Nothing here is signed or sent.
 */
export type PreparedTransaction<Summary = TransferSummary | AllowanceSummary> = {
  summary: Summary;
  tx: unknown;
};

/** Shared by a run's wallet operations and transaction callbacks. */
export type WalletOperationOptions = Readonly<{
  /** Aborts on caller cancellation, the run deadline, or run close. Wallets may stop work cooperatively. */
  signal: AbortSignal;
}>;

/**
 * Receives a prepared transaction only while the run is active. A callback already invoked cannot
 * be retracted; use the signal to cancel any asynchronous host work when the run stops.
 */
export type TransactionHandler = (
  prepared: PreparedTransaction,
  options: WalletOperationOptions
) => void | Promise<void>;

/** One allowance an account has given. */
export type Allowance = { spender: string; token: string; amount: string };

/** A named address the user can send to. */
export type Contact = { alias: string; address: string };

/** A refusal the caller can show to the model or the user. */
export class WalletError extends Error {
  constructor(
    readonly code: WalletErrorCode,
    message: string,
    readonly candidateIds?: readonly string[]
  ) {
    super(message);
    this.name = 'WalletError';
  }
}

/**
 * What the agent needs to prepare transactions. The host implements this interface; no SDK class
 * or transaction format is required. It never signs, sends, or hands out a private key.
 * Optional methods expose optional features: a tool is offered to the model only if the host
 * implements its method.
 * Operations may honor the supplied signal to stop work. The agent discards late results and
 * never starts a transaction callback after that signal aborts, even if the wallet ignores it.
 */
export interface WalletSdk {
  /** The user's address book. The model may name a contact instead of writing its address. */
  getContacts?(options?: WalletOperationOptions): Promise<Contact[]>;
  /** Builds a transfer. Signs and sends nothing. */
  transfer(params: TransferParams, options?: WalletOperationOptions): Promise<PreparedTransaction<TransferSummary>>;
  /** Builds a token allowance. Signs and sends nothing. */
  approve?(params: AllowanceParams, options?: WalletOperationOptions): Promise<PreparedTransaction<AllowanceSummary>>;
  /** The allowances an account has given, oldest first. */
  getAllowances?(owner: string, options?: WalletOperationOptions): Promise<Allowance[]>;
}
