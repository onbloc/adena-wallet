import { Secp256k1 } from '@cosmjs/crypto';
import { toBase64, toHex } from '@cosmjs/encoding';

import { AppError, AppErrorCode, TransactionPendingError } from '../core/errors';
import { Account } from '../domain/account';
import { SCHEDULED_FEE_RESERVE, ScheduledSend } from '../domain/card-template';
import { FeeEstimate } from '../domain/fee';
import { Network } from '../domain/network';
import {
  CardPermissionKind,
  CardPolicy,
  CardRecord,
  CardStatus,
  SESSION_MAX_PER_ACCOUNT,
  SessionCard,
  toAllowPath,
  toSessionCard,
  validateCardPolicy,
} from '../domain/session-card';
import { BroadcastResult, TransactionDraft, TransactionFee } from '../domain/transaction';
import { ChainRegistry } from '../repositories/chain/chain-registry';
import { SessionRepository } from '../repositories/chain/session-repository';
import { SessionCardRepository } from '../repositories/session-card.repository';
import { SessionKeyRepository } from '../repositories/session-key.repository';
import { addAmount, compareAmount } from '../utils/amount';
import { randomBytes } from '../utils/id';
import { AccountService } from './account.service';
import { SessionTaskService } from './session-task.service';
import { TransactionService } from './transaction.service';
import type { AccountScopedData } from './wallet.service';

// A record whose session the chain does not know yet is kept this long before it counts as failed.
export const CARD_CONFIRMATION_GRACE_MS = 10 * 60 * 1000;

export const CardAction = {
  ISSUE: 'issue',
  REVOKE: 'revoke',
  REVOKE_ALL: 'revokeAll',
} as const;

export type CardAction = (typeof CardAction)[keyof typeof CardAction];

// What a review shows and a confirm signs. Issuing estimates with a throwaway key; the real one is made on confirm.
export interface PreparedCardTransaction {
  action: CardAction;
  account: Account;
  network: Network;
  draft: TransactionDraft;
  estimate: FeeEstimate;
  policy?: CardPolicy;
  // A send the new card signs by itself after a delay.
  schedule?: ScheduledSend;
  card?: SessionCard;
}

export interface RealmInspection {
  path: string;
  // Deployed realm packages the entry opens (the path and everything below it).
  realms: string[];
  // Of those, the ones whose public functions can move the caller's tokens.
  tokenRealms: string[];
}

const SECP256K1_PRIVATE_KEY_LENGTH = 32;

// Rejection sampling: a random 32-byte string is a valid key unless it is zero or >= the curve order.
const generateKeyPair = async (): Promise<{ privateKey: Uint8Array; publicKey: Uint8Array }> => {
  for (;;) {
    const privateKey = randomBytes(SECP256K1_PRIVATE_KEY_LENGTH);

    try {
      const { pubkey } = await Secp256k1.makeKeypair(privateKey);

      return { privateKey, publicKey: Secp256k1.compressPubkey(pubkey) };
    }
    catch {
      privateKey.fill(0);
    }
  }
};

export class SessionCardService {
  constructor(
    private readonly chainRegistry: ChainRegistry,
    private readonly accountService: AccountService,
    private readonly transactionService: TransactionService,
    private readonly records: SessionCardRepository,
    private readonly keys: SessionKeyRepository,
    private readonly tasks: SessionTaskService,
    private readonly now: () => number = Date.now,
  ) {}

  isSupported(network: Network): boolean {
    return this.chainRegistry.sessions(network) !== undefined;
  }

  private sessions(network: Network): SessionRepository {
    const repository = this.chainRegistry.sessions(network);

    if (!repository) {
      throw new AppError(AppErrorCode.UNSUPPORTED_NETWORK, 'Cards are not available on this network');
    }

    return repository;
  }

  private nowSeconds(): number {
    return Math.floor(this.now() / 1000);
  }

  async listCards(account: Account, network: Network): Promise<SessionCard[]> {
    const masterAddress = this.accountService.getAddress(account, network);
    const sessions = await this.sessions(network).listSessions(masterAddress, network);
    const records = this.records.list(account.id, network.chainId);
    const nowSeconds = this.nowSeconds();
    const onChain = new Set(sessions.map(session => session.address));

    await this.forgetMissing(records.filter(record => !onChain.has(record.sessionAddress)), masterAddress, network);

    const byAddress = new Map(records.map(record => [record.sessionAddress, record]));

    return sessions
      .map(session => toSessionCard(session, byAddress.get(session.address), nowSeconds))
      .sort((a, b) => {
        if (a.status !== b.status) {
          return a.status === CardStatus.ACTIVE ? -1 : 1;
        }

        return (b.record?.createdAt ?? 0) - (a.record?.createdAt ?? 0) || b.session.expiresAt - a.session.expiresAt;
      });
  }

  // A list without the session is not proof on its own; each record is confirmed missing before its key goes.
  private async forgetMissing(records: CardRecord[], masterAddress: string, network: Network): Promise<void> {
    const settled = records.filter(record => this.now() - record.createdAt > CARD_CONFIRMATION_GRACE_MS);

    for (const record of settled) {
      // A failed lookup keeps the record; the next sync checks again.
      const session = await this.sessions(network).findSession(masterAddress, record.sessionAddress, network).catch(() => undefined);

      if (session === null) {
        await this.forget(record.sessionAddress);
      }
    }
  }

  async getCard(account: Account, network: Network, sessionAddress: string): Promise<SessionCard | null> {
    const masterAddress = this.accountService.getAddress(account, network);
    const session = await this.sessions(network).findSession(masterAddress, sessionAddress, network);

    return session ? toSessionCard(session, this.records.get(sessionAddress), this.nowSeconds()) : null;
  }

  async inspectRealm(path: string, network: Network): Promise<RealmInspection> {
    const sessions = this.sessions(network);
    const realms = await sessions.listRealms(path, network);

    if (realms.length === 0) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, `Nothing is deployed at ${path}`);
    }

    return { path, realms, tokenRealms: await sessions.findTokenRealms(realms, network) };
  }

  async prepareIssue(account: Account, network: Network, policy: CardPolicy, schedule?: ScheduledSend): Promise<PreparedCardTransaction> {
    if (validateCardPolicy(policy).length > 0) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, 'Check the card settings');
    }

    if (schedule) {
      this.assertSchedulable(policy, schedule, network);
    }

    await this.keys.assertAvailable();

    const masterAddress = this.accountService.getAddress(account, network);
    const existing = await this.sessions(network).listSessions(masterAddress, network);

    if (existing.length >= SESSION_MAX_PER_ACCOUNT) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, `This account already has ${SESSION_MAX_PER_ACCOUNT} cards. Revoke one first.`);
    }

    // Same size as the real key, so the estimate holds; it is never stored or shown.
    const placeholder = await generateKeyPair();

    placeholder.privateKey.fill(0);

    const draft = this.draft(network, this.createMessages(masterAddress, placeholder.publicKey, policy, network));
    const estimate = await this.transactionService.estimateFee(draft, account, network);

    return { action: CardAction.ISSUE, account, network, draft, estimate, policy, schedule };
  }

  private assertSchedulable(policy: CardPolicy, schedule: ScheduledSend, network: Network): void {
    const canSend = policy.permissions.some(permission => permission.kind === CardPermissionKind.SEND);
    const cost = addAmount(schedule.amount, SCHEDULED_FEE_RESERVE);

    if (!canSend || !this.chainRegistry.forNetwork(network).isValidAddress(schedule.toAddress, network)) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, 'This card cannot make that send');
    }

    if (!/^[1-9]\d*$/.test(schedule.amount) || compareAmount(cost, policy.spendLimit) > 0) {
      throw new AppError(AppErrorCode.INVALID_AMOUNT, 'The card limit does not cover the send and its fee');
    }

    if (!Number.isInteger(schedule.delaySeconds) || schedule.delaySeconds <= 0 || schedule.delaySeconds >= policy.duration) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, 'The send must run before the card expires');
    }
  }

  async prepareRevoke(account: Account, network: Network, card: SessionCard): Promise<PreparedCardTransaction> {
    const masterAddress = this.accountService.getAddress(account, network);
    const publicKey = card.record?.publicKey ?? card.session.publicKey;

    if (!publicKey) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, 'This card was issued elsewhere. Use Revoke all to end it.');
    }

    const draft = this.draft(network, this.sessions(network).buildRevokeMessages(masterAddress, publicKey));

    return { action: CardAction.REVOKE, account, network, draft, card, estimate: await this.transactionService.estimateFee(draft, account, network) };
  }

  async prepareRevokeAll(account: Account, network: Network): Promise<PreparedCardTransaction> {
    const masterAddress = this.accountService.getAddress(account, network);
    const draft = this.draft(network, this.sessions(network).buildRevokeAllMessages(masterAddress));

    return { action: CardAction.REVOKE_ALL, account, network, draft, estimate: await this.transactionService.estimateFee(draft, account, network) };
  }

  // Signs with the master key; the wallet is unlocked on every screen that can call this.
  async submit(prepared: PreparedCardTransaction, fee: TransactionFee): Promise<BroadcastResult> {
    switch (prepared.action) {
      case CardAction.ISSUE:
        return this.issue(prepared, fee);
      case CardAction.REVOKE:
        return this.revoke(prepared, fee);
      case CardAction.REVOKE_ALL:
        return this.revokeAll(prepared, fee);
    }
  }

  private async issue(prepared: PreparedCardTransaction, fee: TransactionFee): Promise<BroadcastResult> {
    const { account, network, policy } = prepared;

    if (!policy) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, 'Nothing to issue');
    }

    const masterAddress = this.accountService.getAddress(account, network);
    const chain = this.chainRegistry.forNetwork(network);
    const keyPair = await generateKeyPair();
    const sessionAddress = chain.deriveAddress(keyPair.publicKey, network);
    const publicKey = toBase64(keyPair.publicKey);
    // A scheduled send signs with the card later; that copy lives in memory only and is wiped after it runs.
    const taskKey = prepared.schedule ? Uint8Array.from(keyPair.privateKey) : undefined;

    try {
      // Stored before broadcasting, so a committed card never ends up without its key.
      await this.keys.save(sessionAddress, toHex(keyPair.privateKey));
    }
    catch (error) {
      taskKey?.fill(0);
      throw error;
    }
    finally {
      keyPair.privateKey.fill(0);
    }

    const draft = { ...this.draft(network, this.createMessages(masterAddress, keyPair.publicKey, policy, network)), fee };

    try {
      await this.transactionService.assertSufficientFunds(draft, account, network, undefined, prepared.estimate.storageDeposit);

      const result = await this.transactionService.signAndBroadcast(draft, account, network, {
        onSigned: txHash => this.records.save({
          sessionAddress,
          accountId: account.id,
          chainId: network.chainId,
          name: policy.name.trim(),
          publicKey,
          createdAt: this.now(),
          txHash,
        }),
      });

      if (taskKey && prepared.schedule && result.committed) {
        this.tasks.scheduleSend({ network, accountId: account.id, masterAddress, sessionAddress, ...prepared.schedule }, taskKey);
      }

      return result;
    }
    catch (error) {
      // An unknown outcome may still commit; listCards drops the record once the chain confirms it never did.
      if (!(error instanceof TransactionPendingError)) {
        await this.forget(sessionAddress);
      }

      throw error;
    }
    finally {
      // Handed over (and copied) by scheduleSend, or not needed.
      taskKey?.fill(0);
    }
  }

  private async revoke(prepared: PreparedCardTransaction, fee: TransactionFee): Promise<BroadcastResult> {
    const result = await this.broadcast(prepared, fee);
    const address = prepared.card?.session.address;

    if (result.committed && address) {
      this.tasks.cancelForSession(address);
      await this.forget(address);
    }

    return result;
  }

  private async revokeAll(prepared: PreparedCardTransaction, fee: TransactionFee): Promise<BroadcastResult> {
    const result = await this.broadcast(prepared, fee);

    if (result.committed) {
      this.tasks.list().filter(task => task.masterAddress === this.accountService.getAddress(prepared.account, prepared.network))
        .forEach(task => this.tasks.cancelForSession(task.sessionAddress));
      await Promise.all(this.records.list(prepared.account.id, prepared.network.chainId).map(record => this.forget(record.sessionAddress)));
    }

    return result;
  }

  private async broadcast({ account, network, draft, estimate }: PreparedCardTransaction, fee: TransactionFee): Promise<BroadcastResult> {
    const signed = { ...draft, fee };

    await this.transactionService.assertSufficientFunds(signed, account, network, undefined, estimate.storageDeposit);
    return this.transactionService.signAndBroadcast(signed, account, network);
  }

  private createMessages(masterAddress: string, publicKey: Uint8Array, policy: CardPolicy, network: Network): unknown[] {
    return this.sessions(network).buildCreateMessages({
      masterAddress,
      publicKey,
      allowPaths: policy.permissions.map(toAllowPath),
      spendLimit: policy.spendLimit,
      spendPeriod: policy.spendPeriod,
      expiresAt: this.nowSeconds() + policy.duration,
    }, network);
  }

  private draft(network: Network, messages: unknown[]): TransactionDraft {
    return { networkId: network.id, chainId: network.chainId, messages, fee: { gasWanted: '0', gasFee: '' }, memo: '' };
  }

  // The record only goes with its key, so a failed removal is retried by the next sync or reset.
  private async forget(sessionAddress: string): Promise<void> {
    try {
      await this.keys.remove(sessionAddress);
    }
    catch {
      return;
    }

    this.records.remove(sessionAddress);
  }

  // Factory reset: the keychain outlives general storage, so every card key is removed by name.
  async wipeKeys(): Promise<void> {
    await Promise.all(this.records.listAll().map(record => this.keys.remove(record.sessionAddress).catch(() => undefined)));
  }

  readonly accountScopedData: AccountScopedData = {
    removeAccount: (accountId: string): void => {
      this.records.listAll()
        .filter(record => record.accountId === accountId)
        .forEach((record) => {
          void this.forget(record.sessionAddress);
        });
    },
  };
}
