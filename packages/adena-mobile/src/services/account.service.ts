import { fromBase64, toBase64 } from '@cosmjs/encoding';

import { AppError, AppErrorCode } from '../core/errors';
import { KeyringType } from '../crypto/keyring';
import { Account } from '../domain/account';
import { Network } from '../domain/network';
import { AccountRepository } from '../repositories/account.repository';
import { ChainRegistry } from '../repositories/chain/chain-registry';
import { createId } from '../utils/id';
import { KeyringSession } from './keyring-session';

export interface AccountWithAddress extends Account {
  address: string;
}

// Manages account metadata across keyrings; addresses are resolved per network.
export class AccountService {
  constructor(
    private readonly accountRepository: AccountRepository,
    private readonly keyringSession: KeyringSession,
    private readonly chainRegistry: ChainRegistry,
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

  // Derives the account at the next free index of an HD keyring (requires an unlocked session).
  async createAccount(keyringId: string, keyringType: KeyringType, name?: string): Promise<Account> {
    const accounts = this.getAccounts();
    const keyringAccounts = accounts.filter(account => account.keyringId === keyringId);

    if (keyringType !== KeyringType.HD_WALLET && keyringAccounts.length > 0) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, 'Single-key keyrings hold exactly one account');
    }

    const hdIndex = keyringAccounts.reduce((max, account) => Math.max(max, account.hdIndex + 1), 0);
    const publicKey = await this.keyringSession.withKeyPair(keyringId, hdIndex, async keyPair => keyPair.publicKey);
    const account: Account = {
      id: createId(),
      keyringId,
      keyringType,
      name: name?.trim() || `Account ${accounts.length + 1}`,
      hdIndex,
      publicKey: toBase64(publicKey),
      createdAt: Date.now(),
    };

    this.accountRepository.saveAccounts([...accounts, account]);

    if (!this.accountRepository.getCurrentAccountId()) {
      this.accountRepository.setCurrentAccountId(account.id);
    }

    return account;
  }

  isDuplicatePublicKey(publicKey: string): boolean {
    return this.getAccounts().some(account => account.publicKey === publicKey);
  }

  renameAccount(accountId: string, name: string): Account {
    const trimmed = name.trim();

    if (!trimmed) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, 'Account name is required');
    }

    const accounts = this.getAccounts().map(account => (account.id === accountId ? { ...account, name: trimmed } : account));

    this.accountRepository.saveAccounts(accounts);
    return this.getAccount(accountId);
  }

  // Removing the last account of a keyring is the caller's signal to drop the keyring as well.
  removeAccount(accountId: string): { removed: Account; keyringEmpty: boolean } {
    const accounts = this.getAccounts();

    if (accounts.length <= 1) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, 'The last account cannot be removed');
    }

    const removed = this.getAccount(accountId);
    const remaining = accounts.filter(account => account.id !== accountId);

    this.accountRepository.saveAccounts(remaining);

    if (this.accountRepository.getCurrentAccountId() === accountId) {
      this.accountRepository.setCurrentAccountId(remaining[0].id);
    }

    return { removed, keyringEmpty: !remaining.some(account => account.keyringId === removed.keyringId) };
  }

  clear(): void {
    this.accountRepository.clear();
  }
}
