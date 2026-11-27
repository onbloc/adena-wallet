import { fromBase64, toBase64 } from '@cosmjs/encoding';

import { AppError, AppErrorCode } from '../core/errors';
import { isHdIndex } from '../crypto/key-pair';
import { KeyringType } from '../crypto/keyring';
import { Account, ACCOUNT_NAME_MAX_LENGTH, AvatarColor, isAvatarColor, pickAvatarColor } from '../domain/account';
import { Network } from '../domain/network';
import { AccountRepository } from '../repositories/account.repository';
import { ChainRegistry } from '../repositories/chain/chain-registry';
import { createId } from '../utils/id';
import { SerialQueue } from '../utils/serial-queue';
import { KeyringSession } from './keyring-session';

export interface AccountWithAddress extends Account {
  address: string;
}

export interface AppendAccountOptions {
  hdIndex?: number;
  avatarColor?: AvatarColor | null;
}

const lowestUnusedIndex = (accounts: Account[]): number => {
  const used = new Set(accounts.map(account => account.hdIndex));
  let index = 0;

  while (used.has(index)) {
    index++;
  }

  return index;
};

// "Account N" with the first N not already taken, so gaps never produce a duplicate name.
const defaultAccountName = (accounts: Account[]): string => {
  const names = new Set(accounts.map(account => account.name));
  let number = accounts.length + 1;

  while (names.has(`Account ${number}`)) {
    number++;
  }

  return `Account ${number}`;
};

// Manages account metadata across keyrings; addresses are resolved per network.
export class AccountService {
  // Account and keyring mutations share `mutations` (WalletService runs on it too), so index
  // allocation and keyring removal always see each other's result.
  constructor(
    private readonly accountRepository: AccountRepository,
    private readonly keyringSession: KeyringSession,
    private readonly chainRegistry: ChainRegistry,
    private readonly random: () => number = Math.random,
    private readonly mutations: SerialQueue = new SerialQueue(),
  ) {}

  getAccounts(): Account[] {
    return this.accountRepository.getAccounts();
  }

  getAccount(accountId: string): Account {
    const account = this.getAccounts().find(item => item.id === accountId);

    if (!account) {
      throw new AppError(AppErrorCode.WALLET_NOT_FOUND, `Account ${accountId} not found`);
    }

    return account;
  }

  getCurrentAccount(): Account | null {
    const accounts = this.getAccounts();
    const currentId = this.accountRepository.getCurrentAccountId();

    return accounts.find(account => account.id === currentId) ?? accounts[0] ?? null;
  }

  selectAccount(accountId: string): Account {
    const account = this.getAccount(accountId);

    this.accountRepository.setCurrentAccountId(account.id);
    return account;
  }

  getAddress(account: Account, network: Network): string {
    return this.chainRegistry.forNetwork(network).deriveAddress(fromBase64(account.publicKey), network);
  }

  withAddress(account: Account, network: Network): AccountWithAddress {
    return { ...account, address: this.getAddress(account, network) };
  }

  // Derives the account at the lowest free index of an HD keyring (requires an unlocked session), so indexes
  // skipped on a sparse import stay reachable.
  createAccount(keyringId: string, keyringType: KeyringType, name?: string): Promise<Account> {
    return this.mutations.run(() => this.appendAccount(keyringId, keyringType, name));
  }

  runExclusive<T>(task: () => Promise<T>): Promise<T> {
    return this.mutations.run(task);
  }

  // createAccount for callers already inside runExclusive (queuing again would deadlock).
  // `hdIndex` rebuilds a known layout (backup restore); otherwise the lowest free index is used.
  // A given avatarColor is kept and `null` keeps the default; otherwise the wallet's first account
  // uses the default color and later ones get a random preset.
  async appendAccount(keyringId: string, keyringType: KeyringType, name?: string, options: AppendAccountOptions = {}): Promise<Account> {
    const { hdIndex: requestedIndex, avatarColor } = options;
    const epoch = this.keyringSession.epoch;
    const keyringAccounts = this.getAccounts().filter(account => account.keyringId === keyringId);

    if (keyringType !== KeyringType.HD_WALLET && (keyringAccounts.length > 0 || (requestedIndex ?? 0) !== 0)) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, 'Single-key keyrings hold exactly one account');
    }

    if (requestedIndex !== undefined && (!isHdIndex(requestedIndex) || keyringAccounts.some(account => account.hdIndex === requestedIndex))) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, 'This account index is not available');
    }

    const hdIndex = requestedIndex ?? lowestUnusedIndex(keyringAccounts);
    const publicKey = toBase64(await this.keyringSession.withKeyPair(keyringId, hdIndex, async keyPair => keyPair.publicKey));

    // A lock or reset while deriving must not write the account into the next session's storage.
    if (this.keyringSession.epoch !== epoch) {
      throw new AppError(AppErrorCode.WALLET_LOCKED, 'Wallet is locked');
    }

    // Re-read so edits made during the derivation (rename, removal) are kept.
    const accounts = this.getAccounts();

    if (accounts.some(account => account.publicKey === publicKey)) {
      throw new AppError(AppErrorCode.WALLET_ALREADY_EXISTS, 'This account is already added');
    }

    const account: Account = {
      id: createId(),
      keyringId,
      keyringType,
      name: name?.trim() || defaultAccountName(accounts),
      hdIndex,
      publicKey,
      createdAt: Date.now(),
      ...this.resolveAvatarColor(accounts, avatarColor),
    };

    this.accountRepository.saveAccounts([...accounts, account]);

    if (!this.accountRepository.getCurrentAccountId()) {
      this.accountRepository.setCurrentAccountId(account.id);
    }

    return account;
  }

  private resolveAvatarColor(existing: Account[], avatarColor?: AvatarColor | null): Pick<Account, 'avatarColor'> {
    if (isAvatarColor(avatarColor)) {
      return { avatarColor };
    }

    if (avatarColor === null) {
      return {};
    }

    return existing.length === 0 ? {} : { avatarColor: pickAvatarColor(this.random) };
  }

  isDuplicatePublicKey(publicKey: string): boolean {
    return this.getAccounts().some(account => account.publicKey === publicKey);
  }

  renameAccount(accountId: string, name: string): Account {
    return this.updateProfile(accountId, { name });
  }

  // Local profile edits; the avatar color is kept when not given.
  updateProfile(accountId: string, profile: { name: string; avatarColor?: AvatarColor }): Account {
    const trimmed = profile.name.trim();

    if (!trimmed) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, 'Account name is required');
    }

    // An unchanged legacy name stays valid so its color can still be edited.
    if (trimmed.length > ACCOUNT_NAME_MAX_LENGTH && trimmed !== this.getAccount(accountId).name) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, `Enter a name up to ${ACCOUNT_NAME_MAX_LENGTH} characters`);
    }

    if (profile.avatarColor !== undefined && !isAvatarColor(profile.avatarColor)) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, 'Unknown avatar color');
    }

    this.getAccount(accountId);
    const accounts = this.getAccounts().map(account => (account.id === accountId
      ? { ...account, name: trimmed, ...(profile.avatarColor !== undefined && { avatarColor: profile.avatarColor }) }
      : account));

    this.accountRepository.saveAccounts(accounts);
    return this.getAccount(accountId);
  }

  // Validates a removal without saving it; keyringEmpty tells the caller to drop the keyring first.
  planRemoval(accountId: string): { removed: Account; keyringEmpty: boolean } {
    const accounts = this.getAccounts();

    if (accounts.length <= 1) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, 'The last account cannot be removed');
    }

    const removed = this.getAccount(accountId);

    return { removed, keyringEmpty: !accounts.some(account => account.id !== accountId && account.keyringId === removed.keyringId) };
  }

  removeAccount(accountId: string): { removed: Account; keyringEmpty: boolean } {
    const plan = this.planRemoval(accountId);
    const remaining = this.getAccounts().filter(account => account.id !== accountId);

    this.accountRepository.saveAccounts(remaining);

    if (this.accountRepository.getCurrentAccountId() === accountId) {
      this.accountRepository.setCurrentAccountId(remaining[0].id);
    }

    return plan;
  }

  clear(): void {
    this.accountRepository.clear();
  }
}
