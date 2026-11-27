import type { Contact, PreparedTransaction, TransferParams, TransferSummary, WalletOperationOptions, WalletSdk } from 'adena-ai-llm-poc';

import { AppError, AppErrorCode } from '../core/errors';
import { Account } from '../domain/account';
import { AiTransferDraft } from '../domain/ai';
import { Network } from '../domain/network';
import { ManagedToken } from '../domain/token';
import { AiLibrary } from '../infrastructure/ai/ai-library';
import { compareAmount, toDisplayAmount } from '../utils/amount';
import { createId } from '../utils/id';
import { AccountService } from './account.service';
import { AddressBookService } from './address-book.service';
import { TokenService } from './token.service';
import { TransactionService } from './transaction.service';

// Gives the assistant the wallet's data and builds unsigned transfer drafts on the app's own pipeline.
// It never signs or sends: the draft goes to the review sheet, which uses TransactionService.signAndBroadcast.
export class AiWalletService {
  constructor(
    private readonly accountService: AccountService,
    private readonly tokenService: TokenService,
    private readonly transactionService: TransactionService,
    private readonly addressBookService: AddressBookService,
  ) {}

  // Symbols the assistant may prepare: the account's visible tokens.
  async getTokenSymbols(account: Account, network: Network): Promise<string[]> {
    const tokens = await this.tokenService.getTokenList(account, network);

    return [...new Set(tokens.filter(token => token.visible).map(token => token.symbol))];
  }

  createSdk(library: AiLibrary, account: Account, network: Network): WalletSdk {
    const { WalletError, WalletErrorCode, TransactionType, toBaseUnits, fromBaseUnits } = library.agent;
    const owner = this.accountService.getAddress(account, network).toLowerCase();

    const resolveToken = async (input: string): Promise<ManagedToken> => {
      const wanted = input.trim();
      const tokens = (await this.tokenService.getTokenList(account, network)).filter(token => token.visible);
      const exact = tokens.find(token => token.id === wanted);

      if (exact) {
        return exact;
      }

      const matches = tokens.filter(token => token.symbol.toLowerCase() === wanted.toLowerCase());

      if (matches.length === 1) {
        return matches[0];
      }

      if (matches.length === 0) {
        throw new WalletError(WalletErrorCode.UnknownToken, `Unknown token ${input}`);
      }

      // A realm can hold multiple assets; only the canonical registry key identifies one token.
      const candidates = matches.filter(token => !token.isNative && token.id.includes('/')).map(token => token.id);

      if (candidates.length < 2) {
        throw new WalletError(WalletErrorCode.WalletFailed, `Several tokens are named ${input}; ask for the token's registry key`);
      }

      throw new WalletError(WalletErrorCode.AmbiguousToken, `Ambiguous token ${input}: ${candidates.join(', ')}`, candidates);
    };

    return {
      getContacts: async (options?: WalletOperationOptions): Promise<Contact[]> => {
        options?.signal.throwIfAborted();
        return this.addressBookService.getEntriesFor(network).map(entry => ({ alias: entry.name, address: entry.address }));
      },

      transfer: async (params: TransferParams, options?: WalletOperationOptions): Promise<PreparedTransaction<TransferSummary>> => {
        const signal = options?.signal;

        signal?.throwIfAborted();

        if (params.from.toLowerCase() !== owner) {
          throw new WalletError(WalletErrorCode.WalletFailed, 'Transfers can only be prepared from the selected account');
        }

        const token = await resolveToken(params.token);

        signal?.throwIfAborted();
        const units = toBaseUnits(params.amount, token.decimals);

        if (units === null || units <= 0n) {
          throw new WalletError(WalletErrorCode.InvalidAmount, 'Amount must be a positive decimal');
        }

        const amount = units.toString();
        const balances = await this.tokenService.getBalances(account, network, [token]);
        const available = balances[token.id] ?? '0';

        signal?.throwIfAborted();

        if (compareAmount(amount, available) > 0) {
          throw new WalletError(
            WalletErrorCode.InsufficientBalance,
            `Balance is too low (available ${toDisplayAmount(available, token.decimals)} ${token.symbol})`,
          );
        }

        const toAddress = params.to.trim();
        const draft = await this.transactionService.createTransferDraft({ account, network, token, toAddress, amount })
          .catch((error: unknown) => {
            signal?.throwIfAborted();

            if (error instanceof AppError && error.code === AppErrorCode.INVALID_ADDRESS) {
              throw new WalletError(WalletErrorCode.InvalidAddress, 'Recipient is not a valid address');
            }

            if (error instanceof AppError && error.code === AppErrorCode.INVALID_AMOUNT) {
              throw new WalletError(WalletErrorCode.InvalidAmount, 'Amount must be a positive decimal');
            }

            throw new WalletError(WalletErrorCode.WalletFailed, error instanceof Error ? error.message : 'The transfer could not be prepared');
          });

        signal?.throwIfAborted();

        const tx: AiTransferDraft = {
          id: createId(),
          account,
          network,
          token,
          toAddress,
          recipientName: this.addressBookService.getEntriesFor(network).find(entry => entry.address.toLowerCase() === toAddress.toLowerCase())?.name,
          amount,
          draft,
        };
        const summary: TransferSummary = {
          type: TransactionType.Transfer,
          chainId: network.chainId,
          from: owner,
          to: toAddress.toLowerCase(),
          amount: fromBaseUnits(units, token.decimals),
          token: token.symbol,
          ...(!token.isNative ? { packagePath: token.id } : {}),
        };

        return { summary, tx };
      },
    };
  }
}
