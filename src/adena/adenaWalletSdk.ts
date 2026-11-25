import {
  makeMsgCallMessage,
  makeMsgSendMessage,
  TransactionBuilder,
  type SignTransactionOptions,
} from '@adena-wallet/sdk';

import {
  fromBaseUnits,
  toBaseUnits,
  TransactionType,
  WalletError,
  WalletErrorCode,
  type AllowanceParams,
  type AllowanceSummary,
  type PreparedTransaction,
  type TransferParams,
  type TransferSummary,
  type WalletSdk,
} from '../agent';
import { GNO_MAINNET_CHAIN, gnoPublicAddress } from '../harness/mcp';
import { NATIVE_DENOM, type TokenResolver } from './tokens';

/** The Adena SDK transaction a prepared transaction carries in `tx`: what `signTransaction` takes. */
export type AdenaTransaction = SignTransactionOptions['tx'];

export type AdenaWalletSdkOptions = {
  /** Finds the token a symbol or package path names, among what the sender holds. */
  tokens: TokenResolver;
  /** The chain named in the summary. Defaults to Gno mainnet. */
  chainId?: string;
};

// Coin amounts and GRC20 balances are int64 on chain.
const MAX_UNITS = (1n << 63n) - 1n;

const lowerCase = (address: string) => address.trim().toLowerCase();

/**
 * Builds Adena transactions from the arguments it is given. It has no account and no connection
 * to a wallet: `transfer` and `approve` return an unsigned transaction in `tx` (an
 * `AdenaTransaction`) for the caller to sign. Nothing is signed or sent here.
 *
 * Native GNOT moves with a bank send; any other token is a GRC20 realm call (`Transfer`,
 * `Approve`). There is no `getAllowances`: nothing here can list an owner's allowances, so the
 * model is not offered `get_approvals`. There are no contacts either.
 */
export class AdenaWalletSdk implements WalletSdk {
  readonly #tokens: TokenResolver;
  readonly #chainId: string;

  constructor({ tokens, chainId = GNO_MAINNET_CHAIN }: AdenaWalletSdkOptions) {
    this.#tokens = tokens;
    this.#chainId = chainId;
  }

  async transfer(params: TransferParams): Promise<PreparedTransaction<TransferSummary>> {
    const { from, token, units } = await this.#resolve(params);
    const to = this.#address(params.to, 'Recipient is not a valid g1... address');
    if (units > token.balance) {
      throw new WalletError(
        WalletErrorCode.InsufficientBalance,
        `Balance is too low (available ${fromBaseUnits(token.balance, token.decimals)} ${token.symbol})`
      );
    }
    const message =
      token.packagePath === undefined
        ? makeMsgSendMessage({ from_address: from, to_address: to, amount: `${units}${NATIVE_DENOM}` })
        : makeMsgCallMessage({
            caller: from,
            send: '',
            max_deposit: '',
            pkg_path: token.packagePath,
            func: 'Transfer',
            args: [to, units.toString()],
          });
    return {
      summary: {
        type: TransactionType.Transfer,
        chainId: this.#chainId,
        from,
        to,
        amount: fromBaseUnits(units, token.decimals),
        token: token.symbol,
        ...(token.packagePath === undefined ? {} : { packagePath: token.packagePath }),
      },
      tx: TransactionBuilder.create().messages(message).build(),
    };
  }

  async approve(params: AllowanceParams): Promise<PreparedTransaction<AllowanceSummary>> {
    const { from, token, units } = await this.#resolve(params);
    if (token.packagePath === undefined) {
      throw new WalletError(
        WalletErrorCode.UnsupportedToken,
        `${token.symbol} is the native token: it has no allowance`
      );
    }
    const spender = this.#address(params.spender, 'Spender is not a valid g1... address');
    const message = makeMsgCallMessage({
      caller: from,
      send: '',
      max_deposit: '',
      pkg_path: token.packagePath,
      func: 'Approve',
      args: [spender, units.toString()],
    });
    return {
      summary: {
        type: TransactionType.Allowance,
        chainId: this.#chainId,
        from,
        spender,
        amount: fromBaseUnits(units, token.decimals),
        token: token.symbol,
        packagePath: token.packagePath,
      },
      tx: TransactionBuilder.create().messages(message).build(),
    };
  }

  #address(address: string, message: string): string {
    const normalized = lowerCase(address);
    if (!gnoPublicAddress.safeParse(normalized).success) {
      throw new WalletError(WalletErrorCode.InvalidAddress, message);
    }
    return normalized;
  }

  /** The sender, token and base units of a request, or a WalletError saying what is wrong. */
  async #resolve(params: TransferParams | AllowanceParams) {
    const from = this.#address(params.from, 'Sender is not a valid g1... address');
    const token = await this.#tokens(params.token, from);
    const units = toBaseUnits(params.amount, token.decimals);
    if (units === null || units <= 0n || units > MAX_UNITS) {
      throw new WalletError(
        WalletErrorCode.InvalidAmount,
        `Amount must be a positive decimal with at most ${token.decimals} decimals`
      );
    }
    return { from, token, units };
  }
}
