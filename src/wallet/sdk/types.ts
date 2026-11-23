import {
  SignRequestType,
  WalletErrorCode,
  WalletStatus,
  type TokenSymbol,
} from '../constants';

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

/** Free-text message signed by one of the wallet's accounts. */
export type TextMessage = {
  type: typeof SignRequestType.Message;
  signer: string;
  text: string;
};

export type SignRequest = TransferMessage | TextMessage;

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
 * What the LLM layer may call. Keys never cross this boundary: nothing here
 * returns, accepts or logs a private key.
 */
export interface WalletSdk {
  getBalance(address: string): Promise<Balances>;
  /** Builds the message to sign. Moves no funds. */
  transfer(params: TransferParams): Promise<TransferMessage>;
  /** Asks the user to approve, then signs. A signed transfer moves the funds. */
  sign(request: SignRequest, options?: SignOptions): Promise<SignResult>;
}
