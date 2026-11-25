import { AppError, AppErrorCode, isAppError } from '../../../src/core/errors';
import { deriveKeyPair } from '../../../src/crypto/key-pair';
import { KeyringType } from '../../../src/crypto/keyring';
import { mnemonicToSeed } from '../../../src/crypto/mnemonic';
import { StorageKey } from '../../../src/migration/storage-keys';
import { backupFileName } from '../../../src/repositories/cloud-backup/cloud-backup-store';
import { SecureKey } from '../../../src/security/secure-keys';
import { BACKUP_PASSWORD_SAME_AS_WALLET, fingerprintOf } from '../../../src/services/cloud-backup.service';
import { FREE_PASSWORD_ATTEMPTS } from '../../../src/services/password-attempt-limiter';
import { catchError } from '../../helpers/service-fakes';
import { createTestContainer, TEST_MNEMONIC, TEST_PASSWORD } from '../../helpers/test-container';

const BACKUP_PASSWORD = 'violet orbit lantern 42';
const NEW_WALLET_PASSWORD = 'quiet meadow trumpet 7';
const PRIVATE_KEY = '1'.repeat(64);

const codeOf = async (run: () => unknown): Promise<unknown> => {
  const error = await catchError(run);

  return isAppError(error) ? error.code : error;
};

const waitFor = async (condition: () => boolean): Promise<void> => {
  for (let tries = 0; !condition() && tries < 500; tries += 1) {
    await new Promise(resolve => setTimeout(resolve, 5));
  }
};

const setup = async (options: Parameters<typeof createTestContainer>[0] = {}) => {
  let clock = 1_700_000_000_000;
  const env = createTestContainer({ now: () => clock, ...options });
  const account = await env.container.walletService.createWallet({ mnemonic: TEST_MNEMONIC, password: TEST_PASSWORD });

  return {
    ...env,
    account,
    backup: env.container.cloudBackupService,
    tick: (ms = 1000): void => {
      clock += ms;
    },
  };
};

const create = (backup: Awaited<ReturnType<typeof setup>>['backup']) =>
  backup.createBackup({ walletPassword: TEST_PASSWORD, backupPassword: BACKUP_PASSWORD, confirmPassword: BACKUP_PASSWORD });

// Two devices on one cloud account after a restore share the backupId (audit #2).
const twoDevices = async () => {
  const a = await setup();

  await create(a.backup);
  const fileName = [...a.cloudBackupStore.files.keys()][0];
  const b = createTestContainer({ cloudBackup: { files: a.cloudBackupStore.files } });
  const content = await b.container.cloudBackupService.openBackup(fileName, BACKUP_PASSWORD);

  await b.container.cloudBackupService.restoreWallet(content, NEW_WALLET_PASSWORD);
  return { a, b: { ...b, backup: b.container.cloudBackupService }, fileName };
};

const createOn = (backup: Awaited<ReturnType<typeof setup>>['backup'], walletPassword: string, overwrite?: boolean) =>
  backup.createBackup({ walletPassword, backupPassword: BACKUP_PASSWORD, confirmPassword: BACKUP_PASSWORD, overwrite });

describe('CloudBackupService', () => {
  it('reports availability and the provider, never throwing', async () => {
    const { backup, cloudBackupStore } = await setup();

    expect(backup.provider).toBe('icloud');
    expect(await backup.isAvailable()).toBe(true);
    jest.spyOn(cloudBackupStore, 'isAvailable').mockRejectedValue(new Error('boom'));
    expect(await backup.isAvailable()).toBe(false);
  });

  it('starts without a backup', async () => {
    const { backup } = await setup();

    expect(backup.getLocalStatus()).toEqual({ kind: 'none' });
    expect(await backup.getStatus()).toEqual({ kind: 'none' });
  });

  it('creates an encrypted backup of every keyring and records it locally', async () => {
    const { backup, cloudBackupStore, container } = await setup();

    await container.walletService.importPrivateKey(PRIVATE_KEY, 'Imported');
    const status = await create(backup);

    expect(cloudBackupStore.files.size).toBe(1);
    const [[name, file]] = [...cloudBackupStore.files];

    expect(status).toEqual({ kind: 'backedUp', fileName: name, backedUpAt: 1_700_000_000_000, outdated: false, mnemonicCount: 1, privateKeyCount: 1 });

    expect(name).toMatch(/^adena-backup-[0-9a-f]{32}\.json$/);
    expect(file.contents).not.toContain('abandon');
    expect(file.contents).not.toContain(PRIVATE_KEY);
    expect(file.contents).not.toContain(BACKUP_PASSWORD);
    expect(await backup.getStatus()).toEqual(status);
  });

  it('requires the wallet password and a valid, different backup password', async () => {
    const { backup, cloudBackupStore } = await setup();

    expect(await codeOf(() => backup.createBackup({ walletPassword: 'wrong password!', backupPassword: BACKUP_PASSWORD, confirmPassword: BACKUP_PASSWORD })))
      .toBe(AppErrorCode.INVALID_PASSWORD);
    expect(await codeOf(() => backup.createBackup({ walletPassword: TEST_PASSWORD, backupPassword: 'short', confirmPassword: 'short' })))
      .toBe(AppErrorCode.WEAK_PASSWORD);
    expect(await codeOf(() => backup.createBackup({ walletPassword: TEST_PASSWORD, backupPassword: BACKUP_PASSWORD, confirmPassword: 'other' })))
      .toBe(AppErrorCode.WEAK_PASSWORD);
    expect(await codeOf(() => backup.createBackup({ walletPassword: TEST_PASSWORD, backupPassword: TEST_PASSWORD, confirmPassword: TEST_PASSWORD })))
      .toBe(AppErrorCode.WEAK_PASSWORD);
    expect(backup.findBackupPasswordIssue(TEST_PASSWORD, TEST_PASSWORD, TEST_PASSWORD)).toBe(BACKUP_PASSWORD_SAME_AS_WALLET);
    expect(backup.findBackupPasswordIssue(BACKUP_PASSWORD, BACKUP_PASSWORD, TEST_PASSWORD)).toBeNull();
    expect(cloudBackupStore.files.size).toBe(0);
    await expect(backup.verifyWalletPassword(TEST_PASSWORD)).resolves.toBeUndefined();
  });

  it('holds the backup password to a stronger policy than the wallet password', async () => {
    const { backup } = await setup();

    // Valid wallet passwords that are too weak for a file facing offline guessing.
    expect(backup.findBackupPasswordIssue('sunshine2024!', 'sunshine2024!')).toBe('Backup password is too easy to guess. Add more unrelated words or characters.');
    expect(backup.findBackupPasswordIssue('orbit lan 4', 'orbit lan 4')).toBe('Backup password must be 12~256 characters');
    expect(backup.findBackupPasswordIssue('tangerine kayak', 'tangerine kayak')).toBeNull();
    expect(await codeOf(() => backup.createBackup({ walletPassword: TEST_PASSWORD, backupPassword: 'sunshine2024!', confirmPassword: 'sunshine2024!' })))
      .toBe(AppErrorCode.WEAK_PASSWORD);
    await expect(backup.verifyWalletPassword(TEST_PASSWORD)).resolves.toBeUndefined();
  });

  it('marks the backup outdated when keyrings or accounts change, and updates it in place', async () => {
    const { backup, cloudBackupStore, container, account, tick } = await setup();

    await create(backup);
    const [fileName] = [...cloudBackupStore.files.keys()];

    container.accountService.renameAccount(account.id, 'Renamed');
    expect(backup.getLocalStatus()).toMatchObject({ outdated: false });

    await container.accountService.createAccount(account.keyringId, KeyringType.HD_WALLET);
    expect(backup.getLocalStatus()).toMatchObject({ outdated: true });

    const imported = await container.walletService.importPrivateKey(PRIVATE_KEY);

    tick();
    const updated = await create(backup);

    expect(updated).toMatchObject({ outdated: false, backedUpAt: 1_700_000_001_000, privateKeyCount: 1 });
    expect([...cloudBackupStore.files.keys()]).toEqual([fileName]);

    await container.walletService.removeAccount(imported.id, TEST_PASSWORD);
    expect(backup.getLocalStatus()).toMatchObject({ outdated: true });
  });

  it('never uploads by itself when accounts change', async () => {
    const { backup, cloudBackupStore, container, account } = await setup();

    await create(backup);
    const write = jest.spyOn(cloudBackupStore, 'write');

    await container.accountService.createAccount(account.keyringId, KeyringType.HD_WALLET);
    await backup.getStatus();
    expect(write).not.toHaveBeenCalled();
  });

  it('forgets a backup that was deleted from the cloud elsewhere', async () => {
    const { backup, cloudBackupStore } = await setup();

    await create(backup);
    cloudBackupStore.files.clear();
    expect(await backup.getStatus()).toEqual({ kind: 'none' });
    expect(backup.getLocalStatus()).toEqual({ kind: 'none' });
  });

  it('surfaces cloud errors without recording a backup', async () => {
    const { backup, cloudBackupStore } = await setup();

    cloudBackupStore.failNext(new AppError(AppErrorCode.CLOUD_BACKUP_QUOTA));
    expect(await codeOf(() => create(backup))).toBe(AppErrorCode.CLOUD_BACKUP_QUOTA);
    expect(backup.getLocalStatus()).toEqual({ kind: 'none' });
  });

  it('signs in to Google Drive before creating, deleting or an interactive status check', async () => {
    const { backup, cloudBackupStore } = await setup({ cloudBackup: { provider: 'google-drive', requiresSignIn: true } });

    expect(await codeOf(() => backup.findBackups())).toBe(AppErrorCode.CLOUD_BACKUP_NOT_SIGNED_IN);
    await create(backup);
    expect(cloudBackupStore.signInCalls).toBe(1);
    expect(await backup.getStatus({ interactive: true })).toMatchObject({ kind: 'backedUp' });
    await backup.deleteBackup([...cloudBackupStore.files.keys()][0], { walletPassword: TEST_PASSWORD });
    expect(cloudBackupStore.signInCalls).toBe(3);
  });

  it('deletes only the cloud copy, also when it is already gone', async () => {
    const { backup, cloudBackupStore, container } = await setup();
    const remove = (fileName: string) => backup.deleteBackup(fileName, { walletPassword: TEST_PASSWORD });

    await create(backup);
    const [fileName] = [...cloudBackupStore.files.keys()];

    await remove(fileName);
    expect(cloudBackupStore.files.size).toBe(0);
    expect(backup.getLocalStatus()).toEqual({ kind: 'none' });
    expect(await container.walletService.getStatus()).toBe('unlocked');

    await create(backup);
    const [second] = [...cloudBackupStore.files.keys()];

    cloudBackupStore.files.clear();
    await remove(second);
    expect(backup.getLocalStatus()).toEqual({ kind: 'none' });
    await remove(second);

    await create(backup);
    const [third] = [...cloudBackupStore.files.keys()];

    cloudBackupStore.failNext(new AppError(AppErrorCode.NETWORK_ERROR));
    expect(await codeOf(() => remove(third))).toBe(AppErrorCode.NETWORK_ERROR);
    expect(backup.getLocalStatus()).toMatchObject({ kind: 'backedUp' });
  });

  it('requires the wallet password to delete any backup while a wallet exists', async () => {
    const { backup, cloudBackupStore } = await setup();
    const other = backupFileName('5'.repeat(32));

    await create(backup);
    cloudBackupStore.files.set(other, { contents: '{}', modifiedAt: 1 });

    expect(await codeOf(() => backup.deleteBackup(other))).toBe(AppErrorCode.INVALID_REQUEST);
    expect(await codeOf(() => backup.deleteBackup(other, { walletPassword: 'wrong password!' }))).toBe(AppErrorCode.INVALID_PASSWORD);
    expect(await codeOf(() => backup.deleteBackup('../etc/passwd', { walletPassword: TEST_PASSWORD }))).toBe(AppErrorCode.INVALID_REQUEST);
    expect(cloudBackupStore.files.has(other)).toBe(true);

    // A backup of another wallet goes; this wallet's own record stays.
    await backup.deleteBackup(other, { walletPassword: TEST_PASSWORD });
    expect(cloudBackupStore.files.has(other)).toBe(false);
    expect(backup.getLocalStatus()).toMatchObject({ kind: 'backedUp' });
    expect((await backup.findBackups()).map(item => item.current)).toEqual([true]);
  });

  it('deletes a backup without a password before any wallet exists', async () => {
    const env = createTestContainer();
    const fileName = backupFileName('6'.repeat(32));

    env.cloudBackupStore.files.set(fileName, { contents: '{}', modifiedAt: 1 });
    await env.container.cloudBackupService.deleteBackup(fileName);
    expect(env.cloudBackupStore.files.size).toBe(0);
  });

  it('lists restorable backups newest first', async () => {
    const { backup, cloudBackupStore } = await setup();

    cloudBackupStore.files.set(backupFileName('1'.repeat(32)), { contents: '{}', modifiedAt: 10 });
    cloudBackupStore.files.set(backupFileName('2'.repeat(32)), { contents: '{}', modifiedAt: 30 });
    expect(await backup.findBackups({ interactive: true })).toEqual([
      { fileName: backupFileName('2'.repeat(32)), modifiedAt: 30, current: false },
      { fileName: backupFileName('1'.repeat(32)), modifiedAt: 10, current: false },
    ]);
  });

  it('restores every keyring and account into a new wallet with a new password', async () => {
    const source = await setup();
    const { container } = source;

    container.accountService.renameAccount(source.account.id, 'Main');
    const second = await container.accountService.createAccount(source.account.keyringId, KeyringType.HD_WALLET, 'Second');
    const third = await container.accountService.createAccount(source.account.keyringId, KeyringType.HD_WALLET, 'Third');

    await container.walletService.importPrivateKey(PRIVATE_KEY, 'Imported');
    await container.walletService.removeAccount(second.id, TEST_PASSWORD);
    await create(source.backup);
    const original = container.accountService.getAccounts();

    // A new device: empty wallet, same cloud.
    const target = createTestContainer({ cloudBackup: {} });
    const fileName = [...source.cloudBackupStore.files.keys()][0];

    target.cloudBackupStore.files.set(fileName, source.cloudBackupStore.files.get(fileName)!);
    const [found] = await target.container.cloudBackupService.findBackups();
    const content = await target.container.cloudBackupService.openBackup(found.fileName, BACKUP_PASSWORD);
    const selected = await target.container.cloudBackupService.restoreWallet(content, NEW_WALLET_PASSWORD);
    const restored = target.container.accountService.getAccounts();

    // Importing selected the new account on the source device, and the restore keeps that selection.
    expect(selected.name).toBe('Imported');
    expect(restored.map(({ name, hdIndex, publicKey, keyringType }) => ({ name, hdIndex, publicKey, keyringType })))
      .toEqual(original.map(({ name, hdIndex, publicKey, keyringType }) => ({ name, hdIndex, publicKey, keyringType })));
    expect(restored.find(item => item.name === 'Third')?.hdIndex).toBe(third.hdIndex);
    expect(await target.container.walletService.getStatus()).toBe('unlocked');

    // The new password opens the vault; the old one does not.
    target.container.walletService.lock();
    expect(await codeOf(() => target.container.walletService.unlock(TEST_PASSWORD))).toBe(AppErrorCode.INVALID_PASSWORD);
    await target.container.walletService.unlock(NEW_WALLET_PASSWORD);
    const main = restored.find(item => item.name === 'Main')!;

    expect(await target.container.walletService.revealMnemonic(main.keyringId, NEW_WALLET_PASSWORD)).toBe(TEST_MNEMONIC);

    // The restored backup is current for the new device.
    expect(target.container.cloudBackupService.getLocalStatus()).toMatchObject({ kind: 'backedUp', outdated: false, mnemonicCount: 1, privateKeyCount: 1 });
  });

  it('refuses a weak new wallet password without writing a vault', async () => {
    const source = await setup();

    await create(source.backup);
    const target = createTestContainer();
    const fileName = [...source.cloudBackupStore.files.keys()][0];

    target.cloudBackupStore.files.set(fileName, source.cloudBackupStore.files.get(fileName)!);
    const content = await target.container.cloudBackupService.openBackup(fileName, BACKUP_PASSWORD);

    expect(await codeOf(() => target.container.cloudBackupService.restoreWallet(content, 'short'))).toBe(AppErrorCode.WEAK_PASSWORD);
    expect(await target.container.walletService.getStatus()).toBe('empty');
  });

  it('throttles wrong backup passwords with a counter that a factory reset keeps', async () => {
    const source = await setup();

    await create(source.backup);
    const fileName = [...source.cloudBackupStore.files.keys()][0];

    await source.container.appResetService.resetAll();
    // Reset leaves the cloud copy alone.
    expect(source.cloudBackupStore.files.has(fileName)).toBe(true);

    for (let attempt = 0; attempt < FREE_PASSWORD_ATTEMPTS + 1; attempt += 1) {
      expect(await codeOf(() => source.backup.openBackup(fileName, 'wrong password!'))).toBe(AppErrorCode.INVALID_PASSWORD);
    }

    expect(await codeOf(() => source.backup.openBackup(fileName, BACKUP_PASSWORD))).toBe(AppErrorCode.PASSWORD_ATTEMPTS_EXCEEDED);
    await source.container.appResetService.resetAll();
    expect(await source.secureStore.hasItem(SecureKey.BACKUP_PASSWORD_ATTEMPTS)).toBe(true);
    expect(await codeOf(() => source.backup.openBackup(fileName, BACKUP_PASSWORD))).toBe(AppErrorCode.PASSWORD_ATTEMPTS_EXCEEDED);
    // The wallet password limit is separate.
    expect(await source.secureStore.hasItem(SecureKey.PASSWORD_ATTEMPTS)).toBe(false);
  });

  it('does not count a damaged file as a wrong password', async () => {
    const { backup, cloudBackupStore, secureStore } = await setup();
    const fileName = backupFileName('3'.repeat(32));

    cloudBackupStore.files.set(fileName, { contents: 'garbage', modifiedAt: 1 });
    expect(await codeOf(() => backup.openBackup(fileName, BACKUP_PASSWORD))).toBe(AppErrorCode.BACKUP_CORRUPTED);
    expect(await codeOf(() => backup.openBackup(backupFileName('4'.repeat(32)), BACKUP_PASSWORD))).toBe(AppErrorCode.BACKUP_NOT_FOUND);
    expect(await secureStore.hasItem(SecureKey.BACKUP_PASSWORD_ATTEMPTS)).toBe(false);
  });

  it('reports a backup updated on another device and never overwrites it silently', async () => {
    const { a, b, fileName } = await twoDevices();

    expect(await b.backup.getStatus()).not.toHaveProperty('remoteChange');
    a.tick();
    await createOn(a.backup, TEST_PASSWORD);
    const writtenByA = a.cloudBackupStore.files.get(fileName)!.contents;

    expect(await b.backup.getStatus()).toMatchObject({ kind: 'backedUp', remoteChange: 'updatedElsewhere' });
    expect(await codeOf(() => createOn(b.backup, NEW_WALLET_PASSWORD))).toBe(AppErrorCode.BACKUP_CONFLICT);
    expect(a.cloudBackupStore.files.get(fileName)!.contents).toBe(writtenByA);

    // An explicit overwrite wins and bumps the revision past both devices.
    await createOn(b.backup, NEW_WALLET_PASSWORD, true);
    expect(JSON.parse(a.cloudBackupStore.files.get(fileName)!.contents).revision).toBe(3);
    expect(await b.backup.getStatus()).not.toHaveProperty('remoteChange');
    expect(await a.backup.getStatus()).toMatchObject({ remoteChange: 'updatedElsewhere' });
    expect(await codeOf(() => createOn(a.backup, TEST_PASSWORD))).toBe(AppErrorCode.BACKUP_CONFLICT);
  });

  it('detects a cloud copy rolled back to an older revision', async () => {
    const { backup, cloudBackupStore, tick } = await setup();

    await create(backup);
    const [fileName] = [...cloudBackupStore.files.keys()];
    const first = cloudBackupStore.files.get(fileName)!;

    tick();
    await createOn(backup, TEST_PASSWORD, false);
    cloudBackupStore.files.set(fileName, first);

    expect(await backup.getStatus()).toMatchObject({ remoteChange: 'rolledBack' });
    expect(await codeOf(() => create(backup))).toBe(AppErrorCode.BACKUP_CONFLICT);
    await createOn(backup, TEST_PASSWORD, true);
    expect(JSON.parse(cloudBackupStore.files.get(fileName)!.contents).revision).toBe(3);
  });

  it('reports a damaged cloud copy and replaces it only when asked', async () => {
    const { backup, cloudBackupStore } = await setup();

    await create(backup);
    const [fileName] = [...cloudBackupStore.files.keys()];

    cloudBackupStore.files.set(fileName, { contents: 'garbage', modifiedAt: 1 });
    expect(await backup.getStatus()).toMatchObject({ remoteChange: 'unreadable' });
    expect(await codeOf(() => create(backup))).toBe(AppErrorCode.BACKUP_CONFLICT);
    await createOn(backup, TEST_PASSWORD, true);
    expect(await backup.getStatus()).not.toHaveProperty('remoteChange');
  });

  it('does not count a tampered nonce, ciphertext or file name as a wrong password', async () => {
    const { backup, cloudBackupStore, secureStore } = await setup();

    await create(backup);
    const [fileName] = [...cloudBackupStore.files.keys()];
    const envelope = JSON.parse(cloudBackupStore.files.get(fileName)!.contents);
    const tampered = [
      { ...envelope, encryption: { ...envelope.encryption, cipher: { ...envelope.encryption.cipher, nonce: envelope.encryption.cipher.nonce.slice(4) } } },
      { ...envelope, encryption: { ...envelope.encryption, cipher: { ...envelope.encryption.cipher, nonce: '!!not base64!!' } } },
      { ...envelope, encryption: { ...envelope.encryption, ciphertext: 'AAAA' } },
      { ...envelope, encryption: { ...envelope.encryption, kdf: { ...envelope.encryption.kdf, salt: 'AA==' } } },
    ];

    for (const value of tampered) {
      cloudBackupStore.files.set(fileName, { contents: JSON.stringify(value), modifiedAt: 1 });
      expect(await codeOf(() => backup.openBackup(fileName, BACKUP_PASSWORD))).toBe(AppErrorCode.BACKUP_CORRUPTED);
    }

    // The same file under another backup's name.
    const renamed = backupFileName('7'.repeat(32));

    cloudBackupStore.files.set(renamed, { contents: JSON.stringify(envelope), modifiedAt: 1 });
    expect(await codeOf(() => backup.openBackup(renamed, BACKUP_PASSWORD))).toBe(AppErrorCode.BACKUP_CORRUPTED);
    expect(await secureStore.hasItem(SecureKey.BACKUP_PASSWORD_ATTEMPTS)).toBe(false);
  });

  it('restores the account order, avatar colors and the selected account', async () => {
    const source = await setup();
    const { container } = source;
    const imported = await container.walletService.importPrivateKey(PRIVATE_KEY, 'Imported');
    const second = await container.accountService.createAccount(source.account.keyringId, KeyringType.HD_WALLET, 'Second');

    container.accountService.updateProfile(second.id, { name: 'Second', avatarColor: 'violet' });
    container.accountService.selectAccount(imported.id);
    await create(source.backup);

    const target = createTestContainer({ cloudBackup: { files: source.cloudBackupStore.files } });
    const fileName = [...source.cloudBackupStore.files.keys()][0];
    const content = await target.container.cloudBackupService.openBackup(fileName, BACKUP_PASSWORD);
    const selected = await target.container.cloudBackupService.restoreWallet(content, NEW_WALLET_PASSWORD);

    // Colors come back exactly: the default first account, the random one picked at import and the edited one.
    expect(imported.avatarColor).toBeDefined();
    expect(target.container.accountService.getAccounts().map(({ name, avatarColor }) => ({ name, avatarColor })))
      .toEqual([{ name: 'Account 1', avatarColor: undefined }, { name: 'Imported', avatarColor: imported.avatarColor }, { name: 'Second', avatarColor: 'violet' }]);
    expect(selected.name).toBe('Imported');
    expect(target.container.accountService.getCurrentAccount()?.name).toBe('Imported');
  });

  it('leaves no partial wallet when an account cannot be rebuilt', async () => {
    const source = await setup();

    await source.container.accountService.createAccount(source.account.keyringId, KeyringType.HD_WALLET, 'Second');
    await create(source.backup);
    const target = createTestContainer({ cloudBackup: { files: source.cloudBackupStore.files } });
    const fileName = [...source.cloudBackupStore.files.keys()][0];
    const content = await target.container.cloudBackupService.openBackup(fileName, BACKUP_PASSWORD);
    const original = target.container.accountService.appendAccount.bind(target.container.accountService);
    let calls = 0;

    jest.spyOn(target.container.accountService, 'appendAccount').mockImplementation(async (...args) => {
      calls += 1;

      if (calls === 2) {
        throw new AppError(AppErrorCode.STORAGE_ERROR, 'disk full');
      }

      return original(...args);
    });

    expect(await codeOf(() => target.container.cloudBackupService.restoreWallet(content, NEW_WALLET_PASSWORD))).toBe(AppErrorCode.STORAGE_ERROR);
    expect(await target.container.walletService.getStatus()).toBe('empty');
    expect(target.container.accountService.getAccounts()).toEqual([]);
    expect(target.container.cloudBackupService.getLocalStatus()).toEqual({ kind: 'none' });

    // Nothing is left in the way of a second attempt.
    jest.restoreAllMocks();
    await target.container.cloudBackupService.restoreWallet(content, NEW_WALLET_PASSWORD);
    expect(target.container.accountService.getAccounts()).toHaveLength(2);
  });

  it('rolls an interrupted restore back on the next launch so it can be restored again', async () => {
    const source = await setup();

    await source.container.accountService.createAccount(source.account.keyringId, KeyringType.HD_WALLET, 'Second');
    await source.container.accountService.createAccount(source.account.keyringId, KeyringType.HD_WALLET, 'Third');
    const created = await create(source.backup);
    const fileName = created.kind === 'backedUp' ? created.fileName : '';
    const target = createTestContainer({ cloudBackup: { files: source.cloudBackupStore.files } });
    const content = await target.container.cloudBackupService.openBackup(fileName, BACKUP_PASSWORD);
    const original = target.container.accountService.appendAccount.bind(target.container.accountService);
    let calls = 0;

    // The app dies while the second account is written: that call never returns.
    jest.spyOn(target.container.accountService, 'appendAccount').mockImplementation((...args) => {
      calls += 1;
      return calls === 2 ? new Promise(() => undefined) : original(...args);
    });
    void target.container.cloudBackupService.restoreWallet(content, NEW_WALLET_PASSWORD);
    await waitFor(() => calls === 2);
    expect(await target.secureStore.hasItem(SecureKey.VAULT)).toBe(true);
    jest.restoreAllMocks();

    const relaunched = createTestContainer({ cloudBackup: { files: source.cloudBackupStore.files }, relaunch: target });

    expect(await relaunched.container.walletService.getStatus()).toBe('empty');
    expect(await relaunched.secureStore.hasItem(SecureKey.VAULT)).toBe(false);
    expect(relaunched.container.accountService.getAccounts()).toEqual([]);
    expect(relaunched.keyValueStore.getString(StorageKey.RESTORE_PENDING)).toBeUndefined();

    await relaunched.container.cloudBackupService.restoreWallet(content, NEW_WALLET_PASSWORD);
    expect(relaunched.container.accountService.getAccounts().map(account => account.name)).toEqual(['Account 1', 'Second', 'Third']);
    expect(relaunched.container.cloudBackupService.getLocalStatus()).toMatchObject({ kind: 'backedUp', fileName, outdated: false });
    expect(relaunched.keyValueStore.getString(StorageKey.RESTORE_PENDING)).toBeUndefined();
  });

  // A phrase's first key also imported on its own; after general storage was lost only one account holds it.
  const sharedKeyWallet = async () => {
    const source = await setup();
    const { container, account } = source;

    await container.accountService.createAccount(account.keyringId, KeyringType.HD_WALLET, 'Second');
    await container.walletService.removeAccount(account.id, TEST_PASSWORD);
    const first = deriveKeyPair(await mnemonicToSeed(TEST_MNEMONIC), 0);
    const imported = await container.walletService.importPrivateKey(Buffer.from(first.privateKey).toString('hex'));

    container.walletService.lock();
    source.keyValueStore.clearAll();
    await container.walletService.unlock(TEST_PASSWORD);
    return { ...source, hdKeyringId: account.keyringId, pkKeyringId: imported.keyringId };
  };

  it('backs up and restores a keyring whose key already has an account elsewhere, without inventing one', async () => {
    const source = await sharedKeyWallet();
    const original = source.container.accountService.getAccounts();
    const created = await create(source.backup);
    const fileName = created.kind === 'backedUp' ? created.fileName : '';
    const target = createTestContainer({ cloudBackup: { files: source.cloudBackupStore.files } });
    const content = await target.container.cloudBackupService.openBackup(fileName, BACKUP_PASSWORD);

    expect(original.map(item => item.keyringId)).toEqual([source.hdKeyringId]);
    expect(content.keyrings.find(keyring => keyring.id === source.pkKeyringId)?.accounts).toEqual([]);

    await target.container.cloudBackupService.restoreWallet(content, NEW_WALLET_PASSWORD);
    const restored = target.container.accountService.getAccounts();

    expect(restored.map(({ keyringId, name, hdIndex, publicKey }) => ({ keyringId, name, hdIndex, publicKey })))
      .toEqual(original.map(({ keyringId, name, hdIndex, publicKey }) => ({ keyringId, name, hdIndex, publicKey })));
    expect(await target.container.walletService.getStatus()).toBe('unlocked');
    expect(target.keyValueStore.getString(StorageKey.RESTORE_PENDING)).toBeUndefined();
    expect(target.container.cloudBackupService.getLocalStatus()).toMatchObject({ kind: 'backedUp', outdated: false, mnemonicCount: 1, privateKeyCount: 1 });

    // Both keyrings are in the restored vault.
    target.container.walletService.lock();
    await target.container.walletService.unlock(NEW_WALLET_PASSWORD);
    expect(await target.container.walletService.revealMnemonic(source.hdKeyringId, NEW_WALLET_PASSWORD)).toBe(TEST_MNEMONIC);
    await expect(target.container.keyringSession.withKeyPair(source.pkKeyringId, 0, async () => true)).resolves.toBe(true);
  });

  it('still restores an older backup that wrote a placeholder row for such a keyring', async () => {
    const source = await sharedKeyWallet();
    const created = await create(source.backup);
    const fileName = created.kind === 'backedUp' ? created.fileName : '';
    const target = createTestContainer({ cloudBackup: { files: source.cloudBackupStore.files } });
    const content = await target.container.cloudBackupService.openBackup(fileName, BACKUP_PASSWORD);
    const legacy = {
      ...content,
      version: 2,
      keyrings: content.keyrings.map(keyring => (keyring.accounts.length > 0 ? keyring : { ...keyring, accounts: [{ name: '', hdIndex: 0, position: 1 }] })),
    };

    await target.container.cloudBackupService.restoreWallet(legacy, NEW_WALLET_PASSWORD);
    expect(target.container.accountService.getAccounts().map(item => item.keyringId)).toEqual([source.hdKeyringId]);
    expect(await target.container.walletService.getStatus()).toBe('unlocked');
    expect(target.keyValueStore.getString(StorageKey.RESTORE_PENDING)).toBeUndefined();
  });

  it('fingerprints the account layout, ignoring names and order', () => {
    const base = { id: 'a', keyringType: KeyringType.HD_WALLET, publicKey: 'p', createdAt: 0 };
    const a = fingerprintOf([{ ...base, keyringId: 'k', hdIndex: 0, name: 'A' }, { ...base, keyringId: 'k', hdIndex: 1, name: 'B' }]);

    expect(fingerprintOf([{ ...base, keyringId: 'k', hdIndex: 1, name: 'X' }, { ...base, keyringId: 'k', hdIndex: 0, name: 'Y' }])).toBe(a);
    expect(fingerprintOf([{ ...base, keyringId: 'k', hdIndex: 0, name: 'A' }])).not.toBe(a);
  });
});

// A JS timeout does not cancel the native upload, so the write may still land after it was reported as failed.
describe('CloudBackupService write that times out but lands', () => {
  const landThenTimeOut = (store: Awaited<ReturnType<typeof setup>>['cloudBackupStore']): void => {
    const write = store.write.bind(store);

    jest.spyOn(store, 'write').mockImplementationOnce(async (name, contents) => {
      await write(name, contents);
      throw new AppError(AppErrorCode.NETWORK_ERROR, 'iCloud did not respond. Try again.');
    });
  };

  afterEach(() => jest.restoreAllMocks());

  it('recognizes its own landed update instead of reporting a change on another device', async () => {
    const { backup, cloudBackupStore, keyValueStore, tick } = await setup();

    await create(backup);
    tick();
    landThenTimeOut(cloudBackupStore);
    expect(await codeOf(() => create(backup))).toBe(AppErrorCode.NETWORK_ERROR);

    expect(await backup.getStatus()).not.toHaveProperty('remoteChange');
    expect(keyValueStore.getString(StorageKey.CLOUD_BACKUP_PENDING_WRITE)).toBeUndefined();
    tick();
    landThenTimeOut(cloudBackupStore);
    expect(await codeOf(() => create(backup))).toBe(AppErrorCode.NETWORK_ERROR);
    tick();
    await create(backup);
    expect(await backup.getStatus()).toMatchObject({ kind: 'backedUp', backedUpAt: 1_700_000_003_000 });
    expect(cloudBackupStore.files.size).toBe(1);
    expect(keyValueStore.getString(StorageKey.CLOUD_BACKUP_PENDING_WRITE)).toBeUndefined();
  });

  it('reuses the backupId of an unconfirmed first backup instead of leaving an orphan file', async () => {
    const { backup, cloudBackupStore, tick } = await setup();

    landThenTimeOut(cloudBackupStore);
    expect(await codeOf(() => create(backup))).toBe(AppErrorCode.NETWORK_ERROR);
    const [fileName] = [...cloudBackupStore.files.keys()];

    tick();
    await create(backup);
    expect([...cloudBackupStore.files.keys()]).toEqual([fileName]);
    expect(backup.getLocalStatus()).toMatchObject({ kind: 'backedUp', fileName, backedUpAt: 1_700_000_001_000 });
  });

  it('reuses the backupId when the first write never landed', async () => {
    const { backup, cloudBackupStore } = await setup();

    jest.spyOn(cloudBackupStore, 'write').mockRejectedValueOnce(new AppError(AppErrorCode.NETWORK_ERROR, 'iCloud did not respond. Try again.'));
    expect(await codeOf(() => create(backup))).toBe(AppErrorCode.NETWORK_ERROR);
    expect(cloudBackupStore.files.size).toBe(0);
    await create(backup);
    await create(backup);
    expect(cloudBackupStore.files.size).toBe(1);
  });

  it('still reports a write from another device while its own write is unconfirmed', async () => {
    const { a, b } = await twoDevices();

    a.tick();
    jest.spyOn(a.cloudBackupStore, 'write').mockRejectedValueOnce(new AppError(AppErrorCode.NETWORK_ERROR, 'iCloud did not respond. Try again.'));
    expect(await codeOf(() => createOn(a.backup, TEST_PASSWORD))).toBe(AppErrorCode.NETWORK_ERROR);
    await createOn(b.backup, NEW_WALLET_PASSWORD);
    expect(await a.backup.getStatus()).toMatchObject({ remoteChange: 'updatedElsewhere' });
    expect(await codeOf(() => createOn(a.backup, TEST_PASSWORD))).toBe(AppErrorCode.BACKUP_CONFLICT);
  });

  it('reports the landed first backup as backed up', async () => {
    const { backup, cloudBackupStore } = await setup();

    landThenTimeOut(cloudBackupStore);
    expect(await codeOf(() => create(backup))).toBe(AppErrorCode.NETWORK_ERROR);
    expect(backup.getLocalStatus()).toEqual({ kind: 'none' });
    expect(await backup.getStatus()).toMatchObject({ kind: 'backedUp', outdated: false });
    expect(await backup.getStatus()).not.toHaveProperty('remoteChange');
  });
});
