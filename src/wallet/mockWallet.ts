import { fromBaseUnits, toBaseUnits } from './amount';
import { ToolName, TokenSymbol, WalletErrorCode, WalletStatus } from './constants';

export const TOKEN_SYMBOLS = Object.values(TokenSymbol);

// Assumed for the mock; not verified against the real tokens.
export const TOKEN_DECIMALS: Record<TokenSymbol, number> = {
  [TokenSymbol.Gnot]: 6,
  [TokenSymbol.Gns]: 6,
};

// 'g1' + 38 bech32 chars. Format check only, no checksum (assumed format).
const ADDRESS_PATTERN = /^g1[023456789acdefghjklmnpqrstuvwxyz]{38}$/;
export const isValidAddress = (address: string) => ADDRESS_PATTERN.test(address);

export type MockAccount = {
  index: number; // 1-based
  name: string;
  address: string;
  balances: Record<TokenSymbol, string>;
};

export const FIXTURE = {
  accounts: [
    {
      index: 1,
      name: 'Account 1',
      address: 'g1qpzry9x8gf2tvdw0s3jn54khce6mua7lqpzry9',
      balances: { [TokenSymbol.Gnot]: '10', [TokenSymbol.Gns]: '250' },
    },
    {
      index: 2,
      name: 'Account 2',
      address: 'g19x8gf2tvdw0s3jn54khce6mua7lqpzry9x8gf2',
      balances: { [TokenSymbol.Gnot]: '1.5', [TokenSymbol.Gns]: '0' },
    },
  ] satisfies MockAccount[],
  contacts: [
    { alias: 'alice', address: 'g1tvdw0s3jn54khce6mua7lqpzry9x8gf2tvdw0s' },
  ],
  /** An address that is in nobody's contacts; used as a recipient in scenarios. */
  recipient: 'g1l7aum6echk45nj3s0wdvt2fg8x9yrzpql7aum6',
};

export type WalletResult = {
  status: WalletStatus;
  [key: string]: unknown;
};

export type WalletCall = { tool: ToolName; args: unknown; result: WalletResult };

const fail = (code: WalletErrorCode, message: string): WalletResult => ({
  status: WalletStatus.Error,
  code,
  message,
});

/**
 * In-memory wallet. Value checks live here (not in the tool schemas) so that a
 * well-formed but wrong argument is distinguishable from a malformed one.
 * Transfers and signatures never execute: they stop at `WalletStatus.PendingApproval`.
 */
export class MockWallet {
  private balances = new Map<string, bigint>();
  private log: WalletCall[] = [];

  readonly accounts = FIXTURE.accounts;
  readonly contacts = FIXTURE.contacts;

  constructor() {
    for (const account of this.accounts) {
      for (const token of TOKEN_SYMBOLS) {
        const units = toBaseUnits(account.balances[token], TOKEN_DECIMALS[token]);
        this.balances.set(`${account.index}:${token}`, units ?? 0n);
      }
    }
  }

  /** Calls the model made so far (newest last). */
  get calls(): readonly WalletCall[] {
    return this.log;
  }

  reset() {
    this.log = [];
  }

  private record(tool: ToolName, args: unknown, result: WalletResult) {
    this.log.push({ tool, args, result });
    return result;
  }

  private account(index: number) {
    return this.accounts.find((account) => account.index === index);
  }

  getBalance(args: { token: TokenSymbol; account?: number }): WalletResult {
    const { token, account: index = 1 } = args;
    const done = (result: WalletResult) => this.record(ToolName.GetBalance, args, result);

    const account = this.account(index);
    if (!account) return done(fail(WalletErrorCode.UnknownAccount, `No account ${index}`));
    const units = this.balances.get(`${index}:${token}`) ?? 0n;
    return done({
      status: WalletStatus.Ok,
      account: index,
      address: account.address,
      token,
      balance: fromBaseUnits(units, TOKEN_DECIMALS[token]),
    });
  }

  transfer(args: {
    to: string;
    amount: string;
    token: TokenSymbol;
    account?: number;
  }): WalletResult {
    const { to, amount, token, account: index = 1 } = args;
    const done = (result: WalletResult) => this.record(ToolName.Transfer, args, result);

    const account = this.account(index);
    if (!account) return done(fail(WalletErrorCode.UnknownAccount, `No account ${index}`));
    if (!isValidAddress(to)) {
      return done(fail(WalletErrorCode.InvalidAddress, 'Recipient is not a valid g1... address'));
    }
    const decimals = TOKEN_DECIMALS[token];
    const units = toBaseUnits(amount, decimals);
    if (units === null || units <= 0n) {
      return done(fail(WalletErrorCode.InvalidAmount, 'Amount must be a positive decimal'));
    }
    const available = this.balances.get(`${index}:${token}`) ?? 0n;
    if (units > available) {
      return done({
        ...fail(WalletErrorCode.InsufficientBalance, 'Balance is too low'),
        available: fromBaseUnits(available, decimals),
      });
    }
    return done({
      status: WalletStatus.PendingApproval,
      from: account.address,
      to,
      amount: fromBaseUnits(units, decimals),
      token,
      message: 'User approval is required before this transfer is sent',
    });
  }

  signMessage(args: { message: string; account?: number }): WalletResult {
    const { message, account: index = 1 } = args;
    const done = (result: WalletResult) => this.record(ToolName.SignMessage, args, result);

    const account = this.account(index);
    if (!account) return done(fail(WalletErrorCode.UnknownAccount, `No account ${index}`));
    if (message.trim() === '') {
      return done(fail(WalletErrorCode.EmptyMessage, 'Message is empty'));
    }
    return done({
      status: WalletStatus.PendingApproval,
      signer: account.address,
      message: 'User approval is required before signing',
    });
  }
}
