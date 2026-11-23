import { fromBaseUnits, toBaseUnits } from '../amount';
import { SignRequestType, WalletErrorCode, WalletStatus, type TokenSymbol } from '../constants';
import { ADDRESS_LENGTH, INVALID_ADDRESS_LENGTH_MESSAGE, isValidAddress } from './address';
import { FIXTURE, type MockAccount } from './fixture';
import { TOKEN_DECIMALS, TOKEN_SYMBOLS } from './tokens';
import {
  WalletError,
  type ApprovalHandler,
  type Balances,
  type SignOptions,
  type SignRequest,
  type SignResult,
  type TextMessage,
  type TransferMessage,
  type TransferParams,
  type WalletSdk,
} from './types';

const MOCK_CHAIN_ID = 'gnoland-1'; // assumption, not verified

/** One signing popup the wallet showed. `approved` is null while it is open. */
export type ApprovalRecord = { request: SignRequest; approved: boolean | null };

export type MockWalletSdkOptions = {
  /** Shows the signing popup (the app's modal, or a simulated user in tests). */
  requestApproval: ApprovalHandler;
  accounts?: MockAccount[];
  /** Stand-in for the private key. It must never appear in any output. */
  secret?: string;
};

const messageKey = (message: TransferMessage) => `${message.from}:${message.nonce}`;

const sameTransfer = (a: TransferMessage, b: TransferMessage) =>
  a.from === b.from &&
  a.to === b.to &&
  a.amount === b.amount &&
  a.token === b.token &&
  a.nonce === b.nonce &&
  a.chainId === b.chainId;

// FNV-1a: a stable stand-in for a signature, not cryptography.
function fakeDigest(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/**
 * In-memory wallet SDK. Balances move only when the user approves the signing
 * of a transfer message this SDK created itself.
 */
export class MockWalletSdk implements WalletSdk {
  readonly #secret: string;
  readonly #requestApproval: ApprovalHandler;
  readonly #owned = new Set<string>();
  readonly #balances = new Map<string, Map<TokenSymbol, bigint>>();
  readonly #nextNonce = new Map<string, number>();
  readonly #issued = new Map<string, TransferMessage>();
  readonly #applied = new Set<string>();
  readonly #approvals: ApprovalRecord[] = [];

  constructor({
    requestApproval,
    accounts = FIXTURE.accounts,
    secret = 'mock-private-key',
  }: MockWalletSdkOptions) {
    this.#requestApproval = requestApproval;
    this.#secret = secret;
    for (const account of accounts) {
      this.#owned.add(account.address);
      for (const token of TOKEN_SYMBOLS) {
        const units = toBaseUnits(account.balances[token], TOKEN_DECIMALS[token]);
        this.#setUnits(account.address, token, units ?? 0n);
      }
    }
  }

  /** Every signing popup requested so far, oldest first. */
  get approvals(): readonly ApprovalRecord[] {
    return this.#approvals;
  }

  #units(address: string, token: TokenSymbol): bigint {
    return this.#balances.get(address)?.get(token) ?? 0n;
  }

  #setUnits(address: string, token: TokenSymbol, units: bigint) {
    const tokens = this.#balances.get(address) ?? new Map<TokenSymbol, bigint>();
    tokens.set(token, units);
    this.#balances.set(address, tokens);
  }

  /** Throws InvalidAddress: a length message first, then `formatMessage` for other malformed input. */
  #assertAddress(address: string, formatMessage: string) {
    if (address.length !== ADDRESS_LENGTH) {
      throw new WalletError(WalletErrorCode.InvalidAddress, INVALID_ADDRESS_LENGTH_MESSAGE);
    }
    if (!isValidAddress(address)) throw new WalletError(WalletErrorCode.InvalidAddress, formatMessage);
  }

  async getBalance(address: string): Promise<Balances> {
    this.#assertAddress(address, 'Not a valid g1... address');
    const entries = TOKEN_SYMBOLS.map((token) => [
      token,
      fromBaseUnits(this.#units(address, token), TOKEN_DECIMALS[token]),
    ]);
    return Object.fromEntries(entries) as Balances;
  }

  /** Throws a WalletError unless the transfer is allowed right now. */
  #checkTransfer({ from, to, amount, token }: TransferParams) {
    if (!this.#owned.has(from)) {
      throw new WalletError(WalletErrorCode.UnknownAccount, 'Sender is not an account of this wallet');
    }
    this.#assertAddress(to, 'Recipient is not a valid g1... address');
    const decimals = TOKEN_DECIMALS[token];
    const units = toBaseUnits(amount, decimals);
    if (units === null || units <= 0n) {
      throw new WalletError(WalletErrorCode.InvalidAmount, 'Amount must be a positive decimal');
    }
    const available = this.#units(from, token);
    if (units > available) {
      throw new WalletError(
        WalletErrorCode.InsufficientBalance,
        `Balance is too low (available ${fromBaseUnits(available, decimals)} ${token})`
      );
    }
    return { units, amount: fromBaseUnits(units, decimals) };
  }

  async transfer(params: TransferParams): Promise<TransferMessage> {
    const { amount } = this.#checkTransfer(params);
    const nonce = this.#nextNonce.get(params.from) ?? 0;
    this.#nextNonce.set(params.from, nonce + 1);

    const message: TransferMessage = {
      type: SignRequestType.Transfer,
      chainId: MOCK_CHAIN_ID,
      from: params.from,
      to: params.to,
      amount,
      token: params.token,
      nonce,
    };
    this.#issued.set(messageKey(message), message);
    return { ...message };
  }

  async sign(request: SignRequest, options: SignOptions = {}): Promise<SignResult> {
    return request.type === SignRequestType.Transfer
      ? this.#signTransfer(request, options)
      : this.#signText(request, options);
  }

  async #ask(request: SignRequest, options: SignOptions): Promise<boolean> {
    options.signal?.throwIfAborted();
    const record: ApprovalRecord = { request: { ...request }, approved: null };
    this.#approvals.push(record);
    record.approved = await this.#requestApproval({ ...request }, options);
    return record.approved;
  }

  #signature(request: SignRequest): SignResult {
    const digest = fakeDigest(`${this.#secret}|${JSON.stringify(request)}`);
    return { status: WalletStatus.Signed, signature: `mock-sig-${digest}` };
  }

  async #signTransfer(message: TransferMessage, options: SignOptions): Promise<SignResult> {
    const key = messageKey(message);
    if (this.#applied.has(key)) {
      throw new WalletError(WalletErrorCode.AlreadyApplied, 'This transfer was already signed');
    }
    const issued = this.#issued.get(key);
    if (!issued || !sameTransfer(issued, message)) {
      throw new WalletError(WalletErrorCode.InvalidMessage, 'Not a message created by this wallet');
    }
    this.#checkTransfer(issued); // fail before bothering the user

    if (!(await this.#ask(issued, options))) return { status: WalletStatus.Rejected };

    // State may have changed while the popup was open.
    if (this.#applied.has(key)) {
      throw new WalletError(WalletErrorCode.AlreadyApplied, 'This transfer was already signed');
    }
    const { units } = this.#checkTransfer(issued);
    this.#setUnits(issued.from, issued.token, this.#units(issued.from, issued.token) - units);
    this.#setUnits(issued.to, issued.token, this.#units(issued.to, issued.token) + units);
    this.#applied.add(key);
    return this.#signature(issued);
  }

  async #signText(message: TextMessage, options: SignOptions): Promise<SignResult> {
    if (!this.#owned.has(message.signer)) {
      throw new WalletError(WalletErrorCode.UnknownAccount, 'Signer is not an account of this wallet');
    }
    if (message.text.trim() === '') {
      throw new WalletError(WalletErrorCode.EmptyMessage, 'Message is empty');
    }
    if (!(await this.#ask(message, options))) return { status: WalletStatus.Rejected };
    return this.#signature(message);
  }
}
