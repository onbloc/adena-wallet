import { fromBase64 } from '@cosmjs/encoding';

import { AppError, AppErrorCode, TransactionPendingError } from '../core/errors';
import { Account } from '../domain/account';
import { computeFee, DEFAULT_FEE_SELECTION, FeeEstimate, FeeSelection } from '../domain/fee';
import { Network } from '../domain/network';
import { Token } from '../domain/token';
import {
  BroadcastResult,
  MessageSummary,
  SignedTransaction,
  SignerSequence,
  TransactionDraft,
  TransactionFee,
  TransactionLookup,
  TransactionStatus,
} from '../domain/transaction';
import { ChainRegistry } from '../repositories/chain/chain-registry';
import { SigningKey, SimulationSigner } from '../repositories/chain/chain-repository';
import { PendingBroadcastRecord, PendingBroadcastRepository } from '../repositories/pending-broadcast.repository';
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

export const PREVIOUS_TRANSACTION_PENDING_MESSAGE = 'A previous transaction is not confirmed yet. Check Activity before sending again.';
export const PREVIOUS_TRANSACTION_RESOLVED_MESSAGE = 'The previous transaction was already settled. Review the send again.';

export interface SignAndBroadcastOptions {
  // Replace the unconfirmed tx of this account and chain: signed with its sequence, so only one can commit.
  replacePending?: boolean;
}

// A record settled by a reconcile. committed/failed: one of its hashes is on chain; not_included: its
// sequence went to another tx. Each removes only that record.
export type SettledPending
  = { id: string; status: 'committed' | 'failed'; hash: string }
    | { id: string; status: 'not_included' };

// Combined state of an account and chain after checking every record. none: nothing left. replaceable:
// a single record is left, not on chain with its sequence still current, so only a pinned replacement
// may be sent. pending: anything else, stays blocked. `settled` lists only records this call removed.
export type PendingReconciliation
  = ({ status: 'none' } | { status: 'replaceable'; sequence: string } | { status: 'pending' })
    & { settled: SettledPending[] };

type RecordOutcome = SettledPending | { status: 'replaceable'; sequence: string } | { status: 'pending' };

// Chain-agnostic transaction pipeline: draft -> fee -> sign -> broadcast.
export class TransactionService {
  constructor(
    private readonly chainRegistry: ChainRegistry,
    private readonly accountService: AccountService,
    private readonly keyringSession: KeyringSession,
    private readonly pendingBroadcasts: PendingBroadcastRepository,
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

  // `pin` signs with exactly that sequence and fails unless it is still the on-chain one.
  async sign(draft: TransactionDraft, account: Account, network: Network, pin?: SignerSequence): Promise<SignedTransaction> {
    if (draft.networkId !== network.id || draft.chainId !== network.chainId) {
      throw new AppError(AppErrorCode.NETWORK_MISMATCH, 'Transaction network does not match');
    }

    const chain = this.chainRegistry.forNetwork(network);

    return this.keyringSession.withKeyPair(account.keyringId, account.hdIndex, keyPair =>
      chain.signTransaction(draft, keyPair, network, pin));
  }

  broadcast(signed: SignedTransaction, network: Network): Promise<BroadcastResult> {
    return this.chainRegistry.forNetwork(network).broadcastTransaction(signed, network);
  }

  getTransactionStatus(hash: string, network: Network): Promise<TransactionStatus> {
    return this.chainRegistry.forNetwork(network).getTransactionStatus(hash, network);
  }

  // The hash is persisted before sending, so a kill mid-broadcast still blocks a re-send after restart.
  // It is dropped only on a definite outcome; an unknown or uncommitted one keeps it until reconcilePending settles it.
  // Records are scoped by chain id, so a custom network on the same chain shares the block.
  async signAndBroadcast(
    draft: TransactionDraft,
    account: Account,
    network: Network,
    { replacePending = false }: SignAndBroadcastOptions = {},
  ): Promise<BroadcastResult> {
    const { record: replaced, pin } = replacePending ? this.replacementTarget(account, network) : {};

    if (!replacePending) {
      this.assertNoPendingBroadcast(account, network);
    }

    const signed = await this.sign(draft, account, network, pin);
    const hash = this.chainRegistry.forNetwork(network).transactionHash(signed);
    // Checked again right before saving: another send or a reconcile may have run while this one was signing.
    const records = this.pendingBroadcasts.list(account.id, network.chainId);
    const current = replaced && records.find(record => record.id === replaced.id);
    // Re-signing the same draft with the same sequence yields the same tx, which is already tracked.
    const alreadyTracked = Boolean(current?.hashes.includes(hash));

    if (replaced) {
      if (!current || !sameRecord(current, replaced)) {
        throw new AppError(AppErrorCode.PREVIOUS_TRANSACTION_PENDING, PREVIOUS_TRANSACTION_RESOLVED_MESSAGE);
      }

      if (records.length > 1) {
        throw new AppError(AppErrorCode.PREVIOUS_TRANSACTION_PENDING, PREVIOUS_TRANSACTION_PENDING_MESSAGE);
      }

      if (!alreadyTracked) {
        this.pendingBroadcasts.update({ ...current, hashes: [...current.hashes, hash] });
      }
    }
    else {
      this.assertNoPendingBroadcast(account, network);
      this.pendingBroadcasts.add({
        hashes: [hash],
        accountId: account.id,
        chainId: network.chainId,
        createdAt: Date.now(),
        sequence: signed.sequence,
        accountNumber: signed.accountNumber,
      });
    }

    try {
      const result = await this.broadcast(signed, network);

      // Committed with the shared sequence, so no other tx of the record can commit. A tx only
      // accepted into the mempool keeps the record for reconcilePending.
      if (result.committed) {
        this.pendingBroadcasts.remove(account.id, network.chainId, hash);
      }

      return result;
    }
    catch (error) {
      if (error instanceof TransactionPendingError) {
        throw error;
      }

      // A rejected re-send of an already tracked tx says nothing about the earlier broadcast of it.
      if (error instanceof AppError) {
        if (!alreadyTracked) {
          this.pendingBroadcasts.discardHash(account.id, network.chainId, hash);
        }

        throw error;
      }

      // Not a classified rejection, so the node may still have received it.
      throw new TransactionPendingError(hash, undefined, { cause: error });
    }
  }

  // Checks every record of the account and chain on its own: by its hashes, then by the signer
  // sequence, since once the chain moved past it without any of its hashes none can be included.
  async reconcilePending(account: Account, network: Network): Promise<PendingReconciliation> {
    const records = this.pendingBroadcasts.list(account.id, network.chainId);

    if (records.length === 0) {
      return { status: 'none', settled: [] };
    }

    const outcomes = new Map<string, RecordOutcome>();
    const unfound: PendingBroadcastRecord[] = [];

    for (const record of records) {
      const found = await this.findAny(record, network).catch(() => null);

      if (found === null) {
        outcomes.set(record.id, { status: 'pending' });
      }
      else if (found) {
        outcomes.set(record.id, this.resolve(record, found));
      }
      else {
        unfound.push(record);
      }
    }

    if (unfound.length > 0) {
      const sequence = await this.readSequence(account, network);

      for (const record of unfound) {
        outcomes.set(record.id, sequence === undefined ? { status: 'pending' } : await this.reconcileBySequence(record, sequence, network));
      }
    }

    const settled = records.flatMap((record) => {
      const outcome = outcomes.get(record.id);

      return outcome && 'id' in outcome ? [outcome] : [];
    });
    const remaining = this.pendingBroadcasts.list(account.id, network.chainId);

    if (remaining.length === 0) {
      return { status: 'none', settled };
    }

    // Replacement only with a single record left: several may hold different sequences, and they
    // settle as the chain advances (the lower one is included or its sequence gets consumed).
    const only = remaining.length === 1 ? outcomes.get(remaining[0].id) : undefined;

    return only?.status === 'replaceable' ? { status: 'replaceable', sequence: only.sequence, settled } : { status: 'pending', settled };
  }

  // Undefined on an RPC error, which keeps every unfound record pending.
  private async readSequence(account: Account, network: Network): Promise<string | undefined> {
    try {
      return await this.chainRegistry.forNetwork(network).getAccountSequence(this.accountService.getAddress(account, network), network);
    }
    catch {
      return undefined;
    }
  }

  private async reconcileBySequence(record: PendingBroadcastRecord, sequence: string, network: Network): Promise<RecordOutcome> {
    try {
      // A tx that committed between the lookup and the sequence read shows up now.
      const late = await this.findAny(record, network);

      if (late) {
        return this.resolve(record, late);
      }
    }
    catch {
      return { status: 'pending' };
    }

    const current = this.pendingBroadcasts.list(record.accountId, record.chainId).find(item => item.id === record.id);

    // A replacement may have been appended meanwhile; its hash was not looked up.
    if (!current || !sameRecord(current, record)) {
      return { status: 'pending' };
    }

    // Legacy record: its tx used some sequence <= the current one, and a smaller one is already
    // consumed (its hash was not found), so the current sequence is a safe bound to pin and compare.
    if (record.sequence === undefined) {
      this.pendingBroadcasts.update({ ...record, sequence });
      return { status: 'replaceable', sequence };
    }

    const onChain = BigInt(sequence);
    const recorded = BigInt(record.sequence);

    if (onChain > recorded) {
      return this.pendingBroadcasts.remove(record.accountId, record.chainId, record.hashes[0])
        ? { id: record.id, status: 'not_included' }
        : { status: 'pending' };
    }

    return onChain === recorded ? { status: 'replaceable', sequence } : { status: 'pending' };
  }

  private async findAny(record: PendingBroadcastRecord, network: Network): Promise<{ hash: string; status: NonNullable<TransactionLookup> } | undefined> {
    const chain = this.chainRegistry.forNetwork(network);

    for (const hash of record.hashes) {
      const status = await chain.findTransaction(hash, network);

      if (status) {
        return { hash, status };
      }
    }

    return undefined;
  }

  // Reported only by the call that removed the record, so concurrent reconciles do not report it twice.
  private resolve(record: PendingBroadcastRecord, found: { hash: string; status: NonNullable<TransactionLookup> }): RecordOutcome {
    return this.pendingBroadcasts.remove(record.accountId, record.chainId, found.hash)
      ? { id: record.id, ...found }
      : { status: 'pending' };
  }

  // A pinned replacement needs exactly one record, already checked against the chain.
  private replacementTarget(account: Account, network: Network): { record: PendingBroadcastRecord; pin: SignerSequence } {
    const records = this.pendingBroadcasts.list(account.id, network.chainId);
    const [record] = records;

    if (!record) {
      throw new AppError(AppErrorCode.PREVIOUS_TRANSACTION_PENDING, PREVIOUS_TRANSACTION_RESOLVED_MESSAGE);
    }

    // Several records may hold different sequences; none is offered for replacement until one is left.
    if (records.length > 1 || record.sequence === undefined) {
      throw new AppError(AppErrorCode.PREVIOUS_TRANSACTION_PENDING, PREVIOUS_TRANSACTION_PENDING_MESSAGE);
    }

    return { record, pin: { sequence: record.sequence, accountNumber: record.accountNumber } };
  }

  private assertNoPendingBroadcast(account: Account, network: Network): void {
    if (this.pendingBroadcasts.list(account.id, network.chainId).length > 0) {
      throw new AppError(AppErrorCode.PREVIOUS_TRANSACTION_PENDING, PREVIOUS_TRANSACTION_PENDING_MESSAGE);
    }
  }
}

const sameRecord = (a: PendingBroadcastRecord, b: PendingBroadcastRecord): boolean =>
  a.sequence === b.sequence && a.hashes.length === b.hashes.length && a.hashes.every((hash, index) => hash === b.hashes[index]);
