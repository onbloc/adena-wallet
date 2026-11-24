import { fromBaseUnits, toBaseUnits } from '../../agent';
import {
  ADDRESS_LENGTH,
  INVALID_ADDRESS_LENGTH_MESSAGE,
  isValidAddress,
  normalizeAddress,
} from './address';
import { FIXTURE, type MockAccount } from './fixture';
import { TOKEN_DECIMALS, TOKEN_SYMBOLS, type Balances, type TokenSymbol } from './tokens';
import {
  TransactionType,
  WalletError,
  WalletErrorCode,
  type AllowanceParams,
  type AllowanceSummary,
  type Contact,
  type PreparedTransaction,
  type TransferParams,
  type TransferSummary,
  type WalletSdk,
} from '../../agent';

const MOCK_CHAIN_ID = 'gnoland-1'; // assumption, not verified

/** What the wallet holds: balances by address. They never change. */
export type WalletState = {
  balances: Record<string, Balances>;
};

export type MockWalletSdkOptions = {
  accounts?: MockAccount[];
  /** The address book. Defaults to the fixture's. */
  contacts?: readonly Contact[];
};

/**
 * Read-only fixture wallet. It validates and builds transactions but never signs or sends one,
 * so balances stay as they were created.
 */
export class MockWalletSdk implements WalletSdk {
  readonly #balances = new Map<string, Map<TokenSymbol, bigint>>();
  readonly #contacts: readonly Contact[];

  constructor({ accounts = FIXTURE.accounts, contacts = FIXTURE.contacts }: MockWalletSdkOptions = {}) {
    if (accounts.length === 0) throw new Error('MockWalletSdk needs an account');
    this.#contacts = contacts;
    for (const account of accounts) {
      this.#balances.set(
        account.address,
        new Map(
          TOKEN_SYMBOLS.map((token) => [
            token,
            toBaseUnits(account.balances[token], TOKEN_DECIMALS[token]) ?? 0n,
          ])
        )
      );
    }
  }

  async getContacts(): Promise<Contact[]> {
    return [...this.#contacts];
  }

  #units(address: string, token: TokenSymbol): bigint {
    return this.#balances.get(address)?.get(token) ?? 0n;
  }

  /** The mock's token for a symbol (any case). Throws UnknownToken. */
  #token(symbol: string): TokenSymbol {
    const token = TOKEN_SYMBOLS.find((known) => known.toLowerCase() === symbol.trim().toLowerCase());
    if (!token) throw new WalletError(WalletErrorCode.UnknownToken, `Unknown token ${symbol}`);
    return token;
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

  async getBalance(address: string): Promise<Balances> {
    return this.#balancesOf(this.#assertAddress(address, 'Not a valid g1... address'));
  }

  async transfer(params: TransferParams): Promise<PreparedTransaction<TransferSummary>> {
    const token = this.#token(params.token);
    const from = this.#assertAddress(params.from, 'Sender is not a valid g1... address');
    const to = this.#assertAddress(params.to, 'Recipient is not a valid g1... address');
    const decimals = TOKEN_DECIMALS[token];
    const units = this.#positiveUnits(params.amount, token);
    const available = this.#units(from, token);
    if (units > available) {
      throw new WalletError(
        WalletErrorCode.InsufficientBalance,
        `Balance is too low (available ${fromBaseUnits(available, decimals)} ${token})`
      );
    }
    const summary: TransferSummary = {
      type: TransactionType.Transfer,
      chainId: MOCK_CHAIN_ID,
      from,
      to,
      amount: fromBaseUnits(units, decimals),
      token,
    };
    return { summary, tx: { ...summary } };
  }

  /** Like ERC-20, an allowance may exceed the balance. */
  async approve(params: AllowanceParams): Promise<PreparedTransaction<AllowanceSummary>> {
    const token = this.#token(params.token);
    const from = this.#assertAddress(params.from, 'Owner is not a valid g1... address');
    const spender = this.#assertAddress(params.spender, 'Spender is not a valid g1... address');
    const units = this.#positiveUnits(params.amount, token);
    const summary: AllowanceSummary = {
      type: TransactionType.Allowance,
      chainId: MOCK_CHAIN_ID,
      from,
      spender,
      amount: fromBaseUnits(units, TOKEN_DECIMALS[token]),
      token,
    };
    return { summary, tx: { ...summary } };
  }

  /**
   * The balance of each account. For the UI and tests; it is not part of `WalletSdk`, so the
   * model cannot reach it.
   */
  inspect(): WalletState {
    return {
      balances: Object.fromEntries(
        [...this.#balances.keys()].map((address) => [address, this.#balancesOf(address)])
      ),
    };
  }
}
