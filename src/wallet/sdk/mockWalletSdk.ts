import { fromBaseUnits, toBaseUnits } from '../amount';
import { SignRequestType, WalletErrorCode, WalletStatus, type TokenSymbol } from '../constants';
import {
  ADDRESS_LENGTH,
  INVALID_ADDRESS_LENGTH_MESSAGE,
  isValidAddress,
  normalizeAddress,
} from './address';
import { FIXTURE, type MockAccount } from './fixture';
import { TOKEN_DECIMALS, TOKEN_SYMBOLS } from './tokens';
import {
  WalletError,
  type Allowance,
  type AllowanceMessage,
  type AllowanceParams,
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

/** What the wallet holds right now: balances and the allowances given, by address. */
export type WalletState = {
  balances: Record<string, Balances>;
  allowances: Record<string, Allowance[]>;
};

export type MockWalletSdkOptions = {
  /** Shows the signing popup (the app's modal, or a simulated user in tests). */
  requestApproval: ApprovalHandler;
  accounts?: MockAccount[];
  /** Stand-in for the private key. It must never appear in any output. */
  secret?: string;
};

const messageKey = (message: TransferMessage | AllowanceMessage) =>
  `${message.from}:${message.nonce}`;

const sameTransfer = (a: TransferMessage, b: TransferMessage) =>
  a.from === b.from &&
  a.to === b.to &&
  a.amount === b.amount &&
  a.token === b.token &&
  a.nonce === b.nonce &&
  a.chainId === b.chainId;

const sameAllowance = (a: AllowanceMessage, b: AllowanceMessage) =>
  a.from === b.from &&
  a.spender === b.spender &&
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
 * In-memory wallet SDK. Balances move and allowances change only when the user
 * approves the signing of a message this SDK created itself.
 */
export class MockWalletSdk implements WalletSdk {
  readonly #secret: string;
  readonly #requestApproval: ApprovalHandler;
  readonly #owned = new Set<string>();
  readonly #balances = new Map<string, Map<TokenSymbol, bigint>>();
  readonly #nextNonce = new Map<string, number>();
  readonly #issued = new Map<string, TransferMessage | AllowanceMessage>();
  /** Allowances given, by owner and then `spender:token`. Overwritten on a new approval. */
  readonly #allowances = new Map<
    string,
    Map<string, { spender: string; token: TokenSymbol; units: bigint }>
  >();
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

  #setAllowance(owner: string, spender: string, token: TokenSymbol, units: bigint) {
    const given = this.#allowances.get(owner) ?? new Map();
    given.set(`${spender}:${token}`, { spender, token, units });
    this.#allowances.set(owner, given);
  }

  /** One nonce sequence per account, shared by transfers and allowances. */
  #takeNonce(account: string): number {
    const nonce = this.#nextNonce.get(account) ?? 0;
    this.#nextNonce.set(account, nonce + 1);
    return nonce;
  }

  #positiveUnits(amount: string, token: TokenSymbol): bigint {
    const units = toBaseUnits(amount, TOKEN_DECIMALS[token]);
    if (units === null || units <= 0n) {
      throw new WalletError(WalletErrorCode.InvalidAmount, 'Amount must be a positive decimal');
    }
    return units;
  }

  /**
   * Returns the address in lowercase. Throws InvalidAddress: a length message first, then
   * `formatMessage` when the `g1` prefix is missing.
   */
  #assertAddress(address: string, formatMessage: string): string {
    const normalized = normalizeAddress(address);
    if (normalized.length !== ADDRESS_LENGTH) {
      throw new WalletError(WalletErrorCode.InvalidAddress, INVALID_ADDRESS_LENGTH_MESSAGE);
    }
    if (!isValidAddress(normalized)) {
      throw new WalletError(WalletErrorCode.InvalidAddress, formatMessage);
    }
    return normalized;
  }

  #balancesOf(address: string): Balances {
    const entries = TOKEN_SYMBOLS.map((token) => [
      token,
      fromBaseUnits(this.#units(address, token), TOKEN_DECIMALS[token]),
    ]);
    return Object.fromEntries(entries) as Balances;
  }

  #allowancesOf(owner: string): Allowance[] {
    return [...(this.#allowances.get(owner)?.values() ?? [])].map(({ spender, token, units }) => ({
      spender,
      token,
      amount: fromBaseUnits(units, TOKEN_DECIMALS[token]),
    }));
  }

  async getBalance(address: string): Promise<Balances> {
    return this.#balancesOf(this.#assertAddress(address, 'Not a valid g1... address'));
  }

  /** Throws a WalletError unless the transfer is allowed right now. */
  #checkTransfer({ from, to, amount, token }: TransferParams) {
    if (!this.#owned.has(from)) {
      throw new WalletError(WalletErrorCode.UnknownAccount, 'Sender is not an account of this wallet');
    }
    const recipient = this.#assertAddress(to, 'Recipient is not a valid g1... address');
    const decimals = TOKEN_DECIMALS[token];
    const units = this.#positiveUnits(amount, token);
    const available = this.#units(from, token);
    if (units > available) {
      throw new WalletError(
        WalletErrorCode.InsufficientBalance,
        `Balance is too low (available ${fromBaseUnits(available, decimals)} ${token})`
      );
    }
    return { units, amount: fromBaseUnits(units, decimals), to: recipient };
  }

  async transfer(params: TransferParams): Promise<TransferMessage> {
    const { amount, to } = this.#checkTransfer(params);
    const nonce = this.#takeNonce(params.from);

    const message: TransferMessage = {
      type: SignRequestType.Transfer,
      chainId: MOCK_CHAIN_ID,
      from: params.from,
      to,
      amount,
      token: params.token,
      nonce,
    };
    this.#issued.set(messageKey(message), message);
    return { ...message };
  }

  /** Throws a WalletError unless the allowance may be set right now. Like ERC-20, it may exceed the balance. */
  #checkAllowance({ from, spender, amount, token }: AllowanceParams) {
    if (!this.#owned.has(from)) {
      throw new WalletError(WalletErrorCode.UnknownAccount, 'Owner is not an account of this wallet');
    }
    const recipient = this.#assertAddress(spender, 'Spender is not a valid g1... address');
    const units = this.#positiveUnits(amount, token);
    return { units, amount: fromBaseUnits(units, TOKEN_DECIMALS[token]), spender: recipient };
  }

  async approve(params: AllowanceParams): Promise<AllowanceMessage> {
    const { amount, spender } = this.#checkAllowance(params);
    const nonce = this.#takeNonce(params.from);

    const message: AllowanceMessage = {
      type: SignRequestType.Allowance,
      chainId: MOCK_CHAIN_ID,
      from: params.from,
      spender,
      amount,
      token: params.token,
      nonce,
    };
    this.#issued.set(messageKey(message), message);
    return { ...message };
  }

  async getAllowances(owner: string): Promise<Allowance[]> {
    return this.#allowancesOf(this.#assertAddress(owner, 'Not a valid g1... address'));
  }

  /**
   * Everything the wallet holds, by address: each address that has a balance entry (the user's
   * accounts and every recipient so far) and every allowance given. For the UI and tests; it is
   * not part of `WalletSdk`, so the model cannot reach it.
   */
  inspect(): WalletState {
    return {
      balances: Object.fromEntries(
        [...this.#balances.keys()].map((address) => [address, this.#balancesOf(address)])
      ),
      allowances: Object.fromEntries(
        [...this.#allowances.keys()].map((owner) => [owner, this.#allowancesOf(owner)])
      ),
    };
  }

  async sign(request: SignRequest, options: SignOptions = {}): Promise<SignResult> {
    switch (request.type) {
      case SignRequestType.Transfer:
        return this.#signTransfer(request, options);
      case SignRequestType.Allowance:
        return this.#signAllowance(request, options);
      default:
        return this.#signText(request, options);
    }
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
    if (!issued || issued.type !== SignRequestType.Transfer || !sameTransfer(issued, message)) {
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

  async #signAllowance(message: AllowanceMessage, options: SignOptions): Promise<SignResult> {
    const key = messageKey(message);
    if (this.#applied.has(key)) {
      throw new WalletError(WalletErrorCode.AlreadyApplied, 'This approval was already signed');
    }
    const issued = this.#issued.get(key);
    if (!issued || issued.type !== SignRequestType.Allowance || !sameAllowance(issued, message)) {
      throw new WalletError(WalletErrorCode.InvalidMessage, 'Not a message created by this wallet');
    }
    this.#checkAllowance(issued); // fail before bothering the user

    if (!(await this.#ask(issued, options))) return { status: WalletStatus.Rejected };

    // State may have changed while the popup was open.
    if (this.#applied.has(key)) {
      throw new WalletError(WalletErrorCode.AlreadyApplied, 'This approval was already signed');
    }
    const { units } = this.#checkAllowance(issued);
    this.#setAllowance(issued.from, issued.spender, issued.token, units);
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
