import {
  SignRequestType,
  WalletErrorCode,
  WalletStatus,
  type TokenSymbol,
} from './constants';

/** Decimal-string balance per token. */
export type Balances = Record<TokenSymbol, string>;

export type TransferParams = {
  from: string;
  to: string;
  /** Decimal string, e.g. "0.5". */
  amount: string;
  token: TokenSymbol;
};

/** Created by `transfer`; the user signs exactly this. */
export type TransferMessage = TransferParams & {
  type: typeof SignRequestType.Transfer;
  chainId: string;
  nonce: number;
};

/** Lets `spender` use up to `amount` of the owner's `token`. */
export type AllowanceParams = {
  /** The owner: the account that gives the allowance. */
  from: string;
  spender: string;
  /** Decimal string, e.g. "10". */
  amount: string;
  token: TokenSymbol;
};

/** Created by `approve`; the user signs exactly this. */
export type AllowanceMessage = AllowanceParams & {
  type: typeof SignRequestType.Allowance;
  chainId: string;
  nonce: number;
};

/** One allowance an account has given. */
export type Allowance = { spender: string; token: TokenSymbol; amount: string };

/** A named address the user can send to. */
export type Contact = { alias: string; address: string };

/** Free-text message signed by one of the wallet's accounts. */
export type TextMessage = {
  type: typeof SignRequestType.Message;
  signer: string;
  text: string;
};

export type SignRequest = TransferMessage | AllowanceMessage | TextMessage;

export type SignResult =
  | { status: typeof WalletStatus.Signed; signature: string }
  | { status: typeof WalletStatus.Rejected };

export type SignOptions = { signal?: AbortSignal };

/** Shows the signing popup; resolves true when the user approves. */
export type ApprovalHandler = (
  request: SignRequest,
  options: SignOptions
) => Promise<boolean>;

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
 * What the agent needs from a wallet. A wallet app implements this over its own SDK. Keys never
 * cross this boundary: nothing here returns, accepts or logs a private key. Optional methods
 * are optional features: a tool is offered to the model only if the wallet implements its method.
 */
export interface WalletSdk {
  /** The account the user acts as. Read for every run, so a switched account is picked up. */
  getActiveAddress(): Promise<string>;
  /** The user's address book. The model may name a contact instead of writing its address. */
  getContacts?(): Promise<Contact[]>;
  /** Builds the message to sign. Moves no funds. */
  transfer(params: TransferParams): Promise<TransferMessage>;
  /** Asks the user to approve, then signs. A signed transfer moves the funds. */
  sign(request: SignRequest, options?: SignOptions): Promise<SignResult>;
  /** Builds the allowance message to sign. Gives nothing yet. */
  approve?(params: AllowanceParams): Promise<AllowanceMessage>;
  /** The allowances an account has given, oldest first. */
  getAllowances?(owner: string): Promise<Allowance[]>;
}
