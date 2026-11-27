import { fromBaseUnits, toBaseUnits } from '../../agent';
import { GNO_MAINNET_CHAIN, gnoChainId } from '../../harness/mcp';
import {
  ADDRESS_LENGTH,
  INVALID_ADDRESS_LENGTH_MESSAGE,
  isValidAddress,
  normalizeAddress,
} from './address';
import { FIXTURE, type MockAccount } from './fixture';
import { TOKEN_DECIMALS, TOKEN_SYMBOLS, TokenSymbol, type Balances } from './tokens';
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

export type MockMessage =
  | { type: '/bank.MsgSend'; value: { from_address: string; to_address: string; amount: string } }
  | { type: '/vm.m_call'; value: { caller: string; pkg_path: string; func: 'Transfer' | 'Approve'; args: [string, string]; send: string } };

/** Host-owned unsigned draft; never an SDK encoding or a signed transaction. */
export type MockTransaction = { chainId: string; messages: MockMessage[]; signatures: never[] };

const GNS_PATH = 'gno.land/r/gnoswap/gns';

/** What the wallet holds: balances by address. They never change. */
export type WalletState = {
  balances: Record<string, Balances>;
};

export type MockWalletSdkOptions = {
  chainId?: string;
  accounts?: MockAccount[];
  /** The address book. Defaults to the fixture's. */
  contacts?: readonly Contact[];
};

/**
 * Read-only fixture wallet. Returns plain transaction descriptions, without any wallet SDK,
 * encoding, signing, or sending. Balances stay as they were created.
 */
export class MockWalletSdk implements WalletSdk {
  readonly #balances = new Map<string, Map<TokenSymbol, bigint>>();
  readonly #displayBalances = new Map<string, Balances>();
  readonly #holdings = new Map<string, readonly { symbol: string; packagePath: string; decimals: number; units: bigint }[]>();
  readonly #fixtureOwners = new Set<string>();
  readonly #contacts: readonly Contact[];
  readonly #chainId: string;

  constructor({ accounts = FIXTURE.accounts, contacts = FIXTURE.contacts, chainId = GNO_MAINNET_CHAIN }: MockWalletSdkOptions = {}) {
    this.#chainId = gnoChainId.parse(chainId);
    if (accounts.length === 0) throw new Error('MockWalletSdk needs an account');
    this.#contacts = contacts;
    for (const account of accounts) {
      const address = normalizeAddress(account.address);
      this.#balances.set(
        address,
        new Map(
          TOKEN_SYMBOLS.map((token) => [
            token,
            toBaseUnits(account.balances[token], TOKEN_DECIMALS[token]) ?? 0n,
          ])
        )
      );
      if (account.holdings) {
        this.#displayBalances.set(address, { ...account.balances });
        const paths = new Set<string>();
        this.#holdings.set(address, account.holdings.map((holding) => {
          if (!Number.isInteger(holding.decimals) || holding.decimals < 0 || holding.decimals > 36) {
            throw new WalletError(WalletErrorCode.WalletFailed, 'Invalid token holdings snapshot');
          }
          const units = toBaseUnits(holding.amount, holding.decimals);
          if (!holding.symbol.trim() || !holding.packagePath || paths.has(holding.packagePath) || units === null || units < 0n) {
            throw new WalletError(WalletErrorCode.WalletFailed, 'Invalid token holdings snapshot');
          }
          paths.add(holding.packagePath);
          return { ...holding, units };
        }));
      } else {
        this.#fixtureOwners.add(address);
      }
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
    const token = symbol.trim() === GNS_PATH ? 'GNS' : TOKEN_SYMBOLS.find((known) => known.toLowerCase() === symbol.trim().toLowerCase());
    if (!token) throw new WalletError(WalletErrorCode.UnknownToken, `Unknown token ${symbol}`);
    return token;
  }

  #positiveUnits(amount: string, decimals: number): bigint {
    const units = toBaseUnits(amount, decimals);
    if (units === null || units <= 0n) {
      throw new WalletError(WalletErrorCode.InvalidAmount, 'Amount must be a positive decimal');
    }
    return units;
  }

  #resolve(address: string, input: string): { symbol: string; decimals: number; units: bigint; packagePath?: string } {
    const value = input.trim();
    if (this.#fixtureOwners.has(address) || this.#holdings.size === 0) {
      const symbol = this.#token(value);
      return { symbol, decimals: TOKEN_DECIMALS[symbol], units: this.#units(address, symbol), ...(symbol === TokenSymbol.Gns ? { packagePath: GNS_PATH } : {}) };
    }
    const holdings = this.#holdings.get(address) ?? [];
    const exact = holdings.find((holding) => holding.packagePath === value);
    if (exact) return exact;
    const matches = holdings.filter((holding) => holding.symbol.toLowerCase() === value.toLowerCase());
    if (value.toLowerCase() === TokenSymbol.Gnot.toLowerCase()) {
      matches.push({ symbol: TokenSymbol.Gnot, packagePath: '', decimals: TOKEN_DECIMALS.GNOT, units: this.#units(address, TokenSymbol.Gnot) });
    }
    if (matches.length > 1) {
      const ids = matches.map((holding) => holding.packagePath).filter(Boolean);
      throw new WalletError(WalletErrorCode.AmbiguousToken, `Ambiguous token ${value}: ${ids.join(', ')}`, ids);
    }
    const match = matches[0];
    if (!match) throw new WalletError(WalletErrorCode.UnknownToken, `Unknown token ${input}`);
    return { ...match, packagePath: match.packagePath || undefined };
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
    const snapshot = this.#displayBalances.get(address);
    if (snapshot) return { ...snapshot };
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
    const from = this.#assertAddress(params.from, 'Sender is not a valid g1... address');
    const to = this.#assertAddress(params.to, 'Recipient is not a valid g1... address');
    const asset = this.#resolve(from, params.token);
    const { symbol: token, decimals, units: available } = asset;
    const units = this.#positiveUnits(params.amount, decimals);
    if (units > available) {
      throw new WalletError(
        WalletErrorCode.InsufficientBalance,
        `Balance is too low (available ${fromBaseUnits(available, decimals)} ${token})`
      );
    }
    const summary: TransferSummary = {
      type: TransactionType.Transfer,
      chainId: this.#chainId,
      from,
      to,
      amount: fromBaseUnits(units, decimals),
      token,
      ...(asset.packagePath ? { packagePath: asset.packagePath } : {}),
    };
    const message: MockMessage = asset.packagePath
      ? { type: '/vm.m_call', value: { caller: from, pkg_path: asset.packagePath, func: 'Transfer', args: [to, String(units)], send: '' } }
      : { type: '/bank.MsgSend', value: { from_address: from, to_address: to, amount: `${units}ugnot` } };
    const tx: MockTransaction = { chainId: this.#chainId, messages: [message], signatures: [] };
    return { summary, tx };
  }

  /** Like ERC-20, an allowance may exceed the balance. */
  async approve(params: AllowanceParams): Promise<PreparedTransaction<AllowanceSummary>> {
    const from = this.#assertAddress(params.from, 'Owner is not a valid g1... address');
    const spender = this.#assertAddress(params.spender, 'Spender is not a valid g1... address');
    const asset = this.#resolve(from, params.token);
    if (!asset.packagePath) throw new WalletError(WalletErrorCode.UnsupportedToken, 'Native GNOT does not support allowances');
    const { symbol: token, decimals } = asset;
    const units = this.#positiveUnits(params.amount, decimals);
    const summary: AllowanceSummary = {
      type: TransactionType.Allowance,
      chainId: this.#chainId,
      from,
      spender,
      amount: fromBaseUnits(units, decimals),
      token,
      ...(asset.packagePath ? { packagePath: asset.packagePath } : {}),
    };
    const tx: MockTransaction = {
      chainId: this.#chainId,
      messages: [{ type: '/vm.m_call', value: { caller: from, pkg_path: asset.packagePath, func: 'Approve', args: [spender, String(units)], send: '' } }],
      signatures: [],
    };
    return { summary, tx };
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
