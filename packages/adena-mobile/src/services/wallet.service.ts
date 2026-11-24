import { fromHex, toBase64 } from '@cosmjs/encoding';

import { APP_CONFIG } from '../config/app';
import { AppError, AppErrorCode } from '../core/errors';
import { deriveKeyPair, keyPairFromPrivateKey, wipeKeyPair } from '../crypto/key-pair';
import { isValidPrivateKeyHex, KeyringRecord, KeyringType } from '../crypto/keyring';
import { generateMnemonic, isValidMnemonic, mnemonicToSeed, normalizeMnemonic } from '../crypto/mnemonic';
import { Account } from '../domain/account';
import { VaultContent } from '../migration/vault-migrations';
import { BiometricCredentialRepository } from '../repositories/biometric-credential.repository';
import { PreferenceRepository } from '../repositories/preference.repository';
import { findPasswordIssue, PASSWORD_ISSUE_MESSAGE } from '../security/password-policy';
import { BiometryKind, SecurePrompt } from '../security/secure-store';
import { createId } from '../utils/id';
import { SerialQueue } from '../utils/serial-queue';
import { AccountService } from './account.service';
import { KeyringSession } from './keyring-session';
import { VaultService } from './vault.service';

// Any store that keeps data per account and must drop it when the account is removed.
export interface AccountScopedData {
  removeAccount(accountId: string): void;
}

export const WalletStatus = {
  EMPTY: 'empty',
  LOCKED: 'locked',
  UNLOCKED: 'unlocked',
} as const;

export type WalletStatus = (typeof WalletStatus)[keyof typeof WalletStatus];

export interface CreateWalletInput {
  mnemonic: string;
  password: string;
  accountName?: string;
}

// Wallet lifecycle: create/import, lock/unlock, biometrics and keyring management.
// Keyring and account changes run on one queue, so duplicate checks and index allocation see each other.
export class WalletService {
  private readonly queue = new SerialQueue();

  constructor(
    private readonly vaultService: VaultService,
    private readonly keyringSession: KeyringSession,
    private readonly accountService: AccountService,
    private readonly accountScopedData: AccountScopedData[],
    private readonly biometricRepository: BiometricCredentialRepository,
    private readonly preferenceRepository: PreferenceRepository,
  ) {}

  async getStatus(): Promise<WalletStatus> {
    if (!(await this.vaultService.exists())) {
      return WalletStatus.EMPTY;
    }

    return this.keyringSession.isUnlocked() ? WalletStatus.UNLOCKED : WalletStatus.LOCKED;
  }

  generateMnemonic(): string {
    return generateMnemonic(APP_CONFIG.mnemonicStrength);
  }

  // Same rules as the extension: 8~256 characters and a zxcvbn score of 2 or more.
  validatePassword(password: string): void {
    const issue = findPasswordIssue(password);

    if (issue) {
      throw new AppError(AppErrorCode.WEAK_PASSWORD, PASSWORD_ISSUE_MESSAGE[issue]);
    }
  }

  async createWallet({ mnemonic, password, accountName }: CreateWalletInput): Promise<Account> {
    if (!isValidMnemonic(mnemonic)) {
      throw new AppError(AppErrorCode.INVALID_MNEMONIC, 'Invalid recovery phrase');
    }

    this.validatePassword(password);
    const record: KeyringRecord = {
      id: createId(),
      type: KeyringType.HD_WALLET,
      mnemonic: normalizeMnemonic(mnemonic),
      createdAt: Date.now(),
    };
    const epoch = this.keyringSession.epoch;

    return this.queue.run(async () => {
      const content = await this.vaultService.create([record], password);

      this.assertCurrent(epoch);
      this.accountService.clear();
      this.keyringSession.open(content.keyrings);
      return this.accountService.createAccount(record.id, record.type, accountName ?? 'Account 1');
    });
  }

  // The epoch is taken at call time: a lock issued after this call, even while it waits in the queue, wins.
  unlock(password: string): Promise<void> {
    const epoch = this.keyringSession.epoch;

    return this.queue.run(async () => {
      await this.openSession(await this.vaultService.open(password), epoch);
    });
  }

  lock(): void {
    this.keyringSession.close();
  }

  // Biometric unlock reads the password from a biometry-bound keychain item.
  unlockWithBiometrics(prompt: SecurePrompt): Promise<void> {
    const epoch = this.keyringSession.epoch;

    return this.queue.run(async () => {
      const password = await this.biometricRepository.readCredential(prompt);

      if (!password) {
        throw new AppError(AppErrorCode.BIOMETRICS_UNAVAILABLE, 'Biometric unlock is not set up');
      }

      await this.openSession(await this.vaultService.openWithEscrowedPassword(password), epoch);
    });
  }

  // A lock or reset that happened while the vault was being read wins over this unlock.
  private async openSession(content: VaultContent, epoch: number): Promise<void> {
    this.assertCurrent(epoch);
    this.keyringSession.open(content.keyrings);
    await this.restoreMissingAccounts(content.keyrings);
  }

  private assertCurrent(epoch: number): void {
    if (this.keyringSession.epoch !== epoch) {
      throw new AppError(AppErrorCode.WALLET_LOCKED, 'Wallet was locked while unlocking');
    }
  }

  getBiometryKind(): Promise<BiometryKind | null> {
    return this.biometricRepository.getBiometryKind();
  }

  async isBiometricUnlockEnabled(): Promise<boolean> {
    return this.preferenceRepository.get().biometricUnlockEnabled && (await this.biometricRepository.hasCredential());
  }

  async enableBiometricUnlock(password: string): Promise<void> {
    if (!(await this.biometricRepository.getBiometryKind())) {
      throw new AppError(AppErrorCode.BIOMETRICS_UNAVAILABLE, 'Biometric authentication is not available');
    }

    await this.vaultService.verifyPassword(password);
    await this.biometricRepository.saveCredential(password);
    this.preferenceRepository.update({ biometricUnlockEnabled: true });
  }

  async disableBiometricUnlock(): Promise<void> {
    await this.biometricRepository.clear();
    this.preferenceRepository.update({ biometricUnlockEnabled: false });
  }

  async revealMnemonic(keyringId: string, password: string): Promise<string> {
    await this.vaultService.verifyPassword(password);
    return this.keyringSession.getMnemonic(keyringId);
  }

  addMnemonicKeyring(mnemonic: string, password: string, accountName?: string): Promise<Account> {
    return this.queue.run(() => this.addMnemonic(mnemonic, password, accountName));
  }

  importPrivateKey(privateKeyHex: string, password: string, accountName?: string): Promise<Account> {
    return this.queue.run(() => this.addPrivateKey(privateKeyHex, password, accountName));
  }

  // Early check for a clear message; the vault re-checks against every stored keyring.
  private async addMnemonic(mnemonic: string, password: string, accountName?: string): Promise<Account> {
    if (!isValidMnemonic(mnemonic)) {
      throw new AppError(AppErrorCode.INVALID_MNEMONIC, 'Invalid recovery phrase');
    }

    const seed = await mnemonicToSeed(mnemonic);
    const keyPair = deriveKeyPair(seed, 0);

    seed.fill(0);
    const duplicate = this.accountService.isDuplicatePublicKey(toBase64(keyPair.publicKey));

    wipeKeyPair(keyPair);

    if (duplicate) {
      throw new AppError(AppErrorCode.WALLET_ALREADY_EXISTS, 'This recovery phrase is already added');
    }

    return this.addKeyring(
      { id: createId(), type: KeyringType.HD_WALLET, mnemonic: normalizeMnemonic(mnemonic), createdAt: Date.now() },
      password,
      accountName,
    );
  }

  private async addPrivateKey(privateKeyHex: string, password: string, accountName?: string): Promise<Account> {
    const normalized = privateKeyHex.trim().replace(/^0x/, '').toLowerCase();

    if (!isValidPrivateKeyHex(normalized)) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, 'Invalid private key');
    }

    const keyPair = keyPairFromPrivateKey(fromHex(normalized));
    const duplicate = this.accountService.isDuplicatePublicKey(toBase64(keyPair.publicKey));

    wipeKeyPair(keyPair);

    if (duplicate) {
      throw new AppError(AppErrorCode.WALLET_ALREADY_EXISTS, 'This account is already added');
    }

    return this.addKeyring(
      { id: createId(), type: KeyringType.PRIVATE_KEY, privateKey: normalized, createdAt: Date.now() },
      password,
      accountName,
    );
  }

  // The vault is updated first: if that fails, the account stays instead of coming back on the next unlock.
  removeAccount(accountId: string, password: string): Promise<void> {
    return this.queue.run(async () => {
      const { removed, keyringEmpty } = this.accountService.planRemoval(accountId);

      if (keyringEmpty) {
        await this.vaultService.removeKeyring(removed.keyringId, password);
        this.keyringSession.remove(removed.keyringId);
      }
      else {
        await this.vaultService.verifyPassword(password);
      }

      this.accountService.removeAccount(accountId);
      this.accountScopedData.forEach(store => store.removeAccount(accountId));
    });
  }

  // Keychain items survive an iOS reinstall while general storage does not; rebuild index 0 per keyring.
  private async restoreMissingAccounts(keyrings: KeyringRecord[]): Promise<void> {
    const accounts = this.accountService.getAccounts();

    for (const keyring of keyrings) {
      if (!accounts.some(account => account.keyringId === keyring.id)) {
        await this.accountService.createAccount(keyring.id, keyring.type);
      }
    }
  }

  private async addKeyring(record: KeyringRecord, password: string, accountName?: string): Promise<Account> {
    const content = await this.vaultService.addKeyring(record, password);

    this.keyringSession.add(content.keyrings.find(keyring => keyring.id === record.id) ?? record);
    const account = await this.accountService.createAccount(record.id, record.type, accountName);

    this.accountService.selectAccount(account.id);
    return account;
  }
}
