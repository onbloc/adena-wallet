import { fromBase64 } from '@cosmjs/encoding';

import { AppError, AppErrorCode } from '../core/errors';
import { Account } from '../domain/account';
import { computeFee, DEFAULT_FEE_SELECTION, FeeEstimate, FeeSelection } from '../domain/fee';
import { Network } from '../domain/network';
import { Token } from '../domain/token';
import {
  BroadcastResult,
  MessageSummary,
  SignedTransaction,
  TransactionDraft,
  TransactionFee,
} from '../domain/transaction';
import { ChainRegistry } from '../repositories/chain/chain-registry';
import { SigningKey, SimulationSigner } from '../repositories/chain/chain-repository';
import { getDefaultTokensFor } from '../resources';
import { addAmount, compareAmount, parseCoin } from '../utils/amount';
import { BigNumber } from '../utils/big-number';
import { AccountService } from './account.service';
import { KeyringSession } from './keyring-session';

// Extension's GAS_FEE_SAFETY_MARGIN for the MAX amount.
const MAX_FEE_SAFETY_MARGIN = 1.2;

export interface TransferInput {
  account: Account;
  network: Network;
  token: Token;
  toAddress: string;
  // Raw integer amount in the token's smallest unit.
  amount: string;
  memo?: string;
}

const EMPTY_FEE: TransactionFee = { gasWanted: '0', gasFee: '' };

// Chain-agnostic transaction pipeline: draft -> fee -> sign -> broadcast.
export class TransactionService {
  constructor(
    private readonly chainRegistry: ChainRegistry,
    private readonly accountService: AccountService,
    private readonly keyringSession: KeyringSession,
  ) {}

  async createTransferDraft({ account, network, token, toAddress, amount, memo }: TransferInput): Promise<TransactionDraft> {
    const chain = this.chainRegistry.forNetwork(network);

    if (!chain.isValidAddress(toAddress, network)) {
      throw new AppError(AppErrorCode.INVALID_ADDRESS, 'Enter a valid address');
    }

    if (compareAmount(amount, '0') <= 0) {
      throw new AppError(AppErrorCode.INVALID_AMOUNT, 'Enter an amount greater than zero');
    }

    const fromAddress = this.accountService.getAddress(account, network);

    return {
      networkId: network.id,
      chainId: network.chainId,
      messages: await this.chainRegistry.assets(network).buildTransferMessages({ network, fromAddress, toAddress, token, amount }),
      fee: EMPTY_FEE,
      memo: memo ?? '',
    };
  }

  createDraft(account: Account, network: Network, rawMessages: unknown[], memo: string): TransactionDraft {
    const chain = this.chainRegistry.forNetwork(network);
    const signerAddress = this.accountService.getAddress(account, network);

    return {
      networkId: network.id,
      chainId: network.chainId,
      messages: chain.parseMessages(rawMessages, signerAddress),
      fee: EMPTY_FEE,
      memo,
    };
  }

  describe(draft: TransactionDraft, network: Network): MessageSummary[] {
    return this.chainRegistry.forNetwork(network).describeMessages(draft.messages, network);
  }

  estimateFee(draft: TransactionDraft, account: Account, network: Network): Promise<FeeEstimate> {
    const signer: SimulationSigner = {
      publicKey: fromBase64(account.publicKey),
      withKey: this.keyringSession.isUnlocked()
        ? <T>(task: (key: SigningKey) => Promise<T>): Promise<T> => this.keyringSession.withKeyPair(account.keyringId, account.hdIndex, task)
        : undefined,
    };

    return this.chainRegistry.forNetwork(network).estimateFee(draft, signer, network);
  }

  applyFee(draft: TransactionDraft, estimate: FeeEstimate, selection: FeeSelection = DEFAULT_FEE_SELECTION): TransactionDraft {
    const { gasWanted, gasFee } = computeFee(estimate, selection);

    return { ...draft, fee: { gasWanted, gasFee } };
  }

  async withEstimatedFee(draft: TransactionDraft, account: Account, network: Network, selection?: FeeSelection): Promise<TransactionDraft> {
    return this.applyFee(draft, await this.estimateFee(draft, account, network), selection);
  }

  // Largest amount of `token` that still leaves room for the network fee and the storage
  // deposit when both are paid in the same coin. Mirrors the extension's MAX: the fee is
  // simulated for ~90% of the balance and padded by MAX_FEE_SAFETY_MARGIN.
  async maxTransferAmount(input: { account: Account; network: Network; token: Token; toAddress: string; balance: string }): Promise<string> {
    const { account, network, token, toAddress, balance } = input;

    if (token.denom !== network.feeToken.denom || compareAmount(balance, '0') <= 0) {
      return balance;
    }

    const probeAmount = new BigNumber(balance).multipliedBy(0.9).integerValue(BigNumber.ROUND_DOWN).toFixed(0);
    const draft = await this.createTransferDraft({ account, network, token, toAddress, amount: probeAmount === '0' ? balance : probeAmount });
    const estimate = await this.estimateFee(draft, account, network);
    const { gasWanted } = computeFee(estimate, DEFAULT_FEE_SELECTION);
    const reservedFee = new BigNumber(gasWanted).multipliedBy(estimate.gasPrice).multipliedBy(MAX_FEE_SAFETY_MARGIN).integerValue(BigNumber.ROUND_UP);
    const max = new BigNumber(balance).minus(reservedFee).minus(estimate.storageDeposit ?? '0');

    return BigNumber.max(max, 0).toFixed(0);
  }

  // Every token involved (fee token, transferred token) must cover its own total,
  // including a Gno storage deposit paid in the fee token.
  async assertSufficientFunds(
    draft: TransactionDraft,
    account: Account,
    network: Network,
    transfer?: { token: Token; amount: string },
    storageDeposit = '0',
  ): Promise<void> {
    const fee = parseCoin(draft.fee.gasFee);
    const feeToken = getDefaultTokensFor(network).find(token => token.denom === (fee?.denom ?? network.feeToken.denom));
    const required = new Map<string, { token: Token; amount: string }>();

    if (feeToken && fee) {
      required.set(feeToken.id, { token: feeToken, amount: addAmount(fee.amount, storageDeposit) });
    }

    if (transfer) {
      const existing = required.get(transfer.token.id);

      required.set(transfer.token.id, { token: transfer.token, amount: addAmount(existing?.amount ?? '0', transfer.amount) });
    }

    if (required.size === 0) {
      return;
    }

    const address = this.accountService.getAddress(account, network);
    const balances = await this.chainRegistry.assets(network).getBalances(address, [...required.values()].map(item => item.token), network);

    for (const { token, amount } of required.values()) {
      if (compareAmount(balances[token.id] ?? '0', amount) < 0) {
        const forFee = token.id === feeToken?.id && transfer?.token.id !== token.id;

        throw new AppError(AppErrorCode.INSUFFICIENT_BALANCE, forFee ? `Insufficient ${token.symbol} for the network fee` : `Insufficient ${token.symbol} balance`);
      }
    }
  }

  async sign(draft: TransactionDraft, account: Account, network: Network): Promise<SignedTransaction> {
    if (draft.networkId !== network.id || draft.chainId !== network.chainId) {
      throw new AppError(AppErrorCode.NETWORK_MISMATCH, 'Transaction network does not match');
    }

    const chain = this.chainRegistry.forNetwork(network);

    return this.keyringSession.withKeyPair(account.keyringId, account.hdIndex, keyPair =>
      chain.signTransaction(draft, keyPair, network));
  }

  broadcast(signed: SignedTransaction, network: Network): Promise<BroadcastResult> {
    return this.chainRegistry.forNetwork(network).broadcastTransaction(signed, network);
  }

  async signAndBroadcast(draft: TransactionDraft, account: Account, network: Network): Promise<BroadcastResult> {
    return this.broadcast(await this.sign(draft, account, network), network);
  }
}
