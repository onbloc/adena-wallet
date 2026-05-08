/**
 * @jest-environment node
 */
import { decryptXChacha20, encryptAES } from 'adena-module';
import CryptoJS from 'crypto-js';
import sodium from 'libsodium-wrappers-sumo';
import { StorageMigration018 } from './storage-migration-v018';

const LEGACY_SALT = 'W9+fs3FJ9p5KdR1XzQy2A6ZT4vjN8LvM9J8pVZmN9rU=';
const RAW_PASSWORD = '123';
const HASHED_PASSWORD = CryptoJS.SHA256(LEGACY_SALT + RAW_PASSWORD).toString();

const WALLET_JSON = JSON.stringify({
  accounts: [],
  keyrings: [],
  currentAccountId: '',
});

const ADDRESS_BOOK_JSON = JSON.stringify([
  { id: 'addr1', name: 'Test', address: 'g1abc', createdAt: '0' },
]);

const createMockData = (
  serialized: string,
  addressBook = '',
  encryptedStoredPassword = '',
) => ({
  NETWORKS: [],
  CURRENT_CHAIN_ID: 'test9.1',
  CURRENT_NETWORK_ID: 'test9.1',
  SERIALIZED: serialized,
  ENCRYPTED_STORED_PASSWORD: encryptedStoredPassword,
  CURRENT_ACCOUNT_ID: '',
  ACCOUNT_NAMES: {},
  ESTABLISH_SITES: {},
  ADDRESS_BOOK: addressBook,
  ACCOUNT_TOKEN_METAINFOS: {},
  QUESTIONNAIRE_EXPIRED_DATE: null,
  WALLET_CREATION_GUIDE_CONFIRM_DATE: null,
  ADD_ACCOUNT_GUIDE_CONFIRM_DATE: null,
  ACCOUNT_GRC721_COLLECTIONS: {},
  ACCOUNT_GRC721_PINNED_PACKAGES: {},
});

describe('storage migration V018', () => {
  // encryptAES uses Argon2id KDF internally, so we prepare test data with it
  let encryptedSerialized: string;
  let encryptedAddressBook: string;

  beforeAll(async () => {
    encryptedSerialized = await encryptAES(WALLET_JSON, HASHED_PASSWORD);
    encryptedAddressBook = await encryptAES(ADDRESS_BOOK_JSON, HASHED_PASSWORD);
  });

  it('version', () => {
    const migration = new StorageMigration018();
    expect(migration.version).toBe(18);
  });

  it('up without password throws when SERIALIZED exists', async () => {
    // Refusing to bump version when we cannot re-encrypt the existing wallet
    // is what prevents the wallet from being permanently locked after a
    // login attempt with an empty/missing password.
    const mockData = {
      version: 17,
      data: createMockData(encryptedSerialized),
    };
    const migration = new StorageMigration018();

    await expect(migration.up(mockData)).rejects.toThrow(/requires a password/);
  });

  it('up without password succeeds when SERIALIZED is empty (fresh install)', async () => {
    const mockData = {
      version: 17,
      data: createMockData(''),
    };
    const migration = new StorageMigration018();
    const result = await migration.up(mockData);

    expect(result.version).toBe(18);
    expect(result.data.SERIALIZED).toBe('');
    expect(result.data.KDF_SALT).toBeTruthy();
  });

  it('up with raw password decrypts hashed-password AES data and re-encrypts with XChaCha20', async () => {
    const mockData = {
      version: 17,
      data: createMockData(encryptedSerialized),
    };
    const migration = new StorageMigration018();
    const result = await migration.up(mockData, RAW_PASSWORD);

    expect(result.version).toBe(18);
    expect(result.data.KDF_SALT).toBeTruthy();

    // SERIALIZED should now be XChaCha20 format
    const parsed = JSON.parse(result.data.SERIALIZED);
    expect(parsed.ciphertext).toBeTruthy();
    expect(parsed.nonce).toBeTruthy();

    // Decrypt with RAW password (new system uses raw password)
    await sodium.ready;
    const salt = Uint8Array.from(Buffer.from(result.data.KDF_SALT, 'base64'));
    const decrypted = await decryptXChacha20(parsed, RAW_PASSWORD, salt);
    const wallet = JSON.parse(decrypted);
    expect(wallet).toHaveProperty('accounts');
    expect(wallet).toHaveProperty('keyrings');
  });

  it('migrated data cannot be decrypted with hashed password', async () => {
    const mockData = {
      version: 17,
      data: createMockData(encryptedSerialized),
    };
    const migration = new StorageMigration018();
    const result = await migration.up(mockData, RAW_PASSWORD);

    await sodium.ready;
    const parsed = JSON.parse(result.data.SERIALIZED);
    const salt = Uint8Array.from(Buffer.from(result.data.KDF_SALT, 'base64'));

    await expect(decryptXChacha20(parsed, HASHED_PASSWORD, salt)).rejects.toThrow();
  });

  it('up with password also migrates ADDRESS_BOOK', async () => {
    const mockData = {
      version: 17,
      data: createMockData(encryptedSerialized, encryptedAddressBook),
    };
    const migration = new StorageMigration018();
    const result = await migration.up(mockData, RAW_PASSWORD);

    const parsed = JSON.parse(result.data.ADDRESS_BOOK);
    expect(parsed.ciphertext).toBeTruthy();
    expect(parsed.nonce).toBeTruthy();

    await sodium.ready;
    const salt = Uint8Array.from(Buffer.from(result.data.KDF_SALT, 'base64'));
    const decrypted = await decryptXChacha20(parsed, RAW_PASSWORD, salt);
    const addressBook = JSON.parse(decrypted);
    expect(addressBook).toHaveLength(1);
    expect(addressBook[0].name).toBe('Test');
  });

  it('up with wrong password throws so caller can preserve v017 state', async () => {
    // Throwing causes StorageMigrator.migrate to back up and return null,
    // which keeps chrome.storage at version 17 with the original AES-CBC
    // ciphertext intact. Critical: prevents version bump on bad password,
    // which would otherwise lock the wallet after a single typo.
    const mockData = {
      version: 17,
      data: createMockData(encryptedSerialized),
    };
    const migration = new StorageMigration018();

    await expect(migration.up(mockData, 'wrong_password')).rejects.toThrow(
      /cannot decrypt SERIALIZED/,
    );
  });

  it('retrying with correct password after a wrong-password failure still succeeds', async () => {
    // The original v017 state must not be mutated by a failed migration —
    // the same input must migrate cleanly when the correct password is
    // supplied on retry.
    const originalData = createMockData(encryptedSerialized, encryptedAddressBook);
    const migration = new StorageMigration018();

    await expect(
      migration.up({ version: 17, data: originalData }, 'wrong_password'),
    ).rejects.toThrow();

    // The caller (StorageMigrator) preserves the original storage on throw,
    // so a retry sees the same v017 snapshot.
    const result = await migration.up({ version: 17, data: originalData }, RAW_PASSWORD);
    expect(result.version).toBe(18);
    const parsed = JSON.parse(result.data.SERIALIZED);
    expect(parsed.ciphertext).toBeTruthy();
  });

  it('up with wrong password also throws for ADDRESS_BOOK migration', async () => {
    // SERIALIZED migration runs first; if SERIALIZED is empty but
    // ADDRESS_BOOK is not, ADDRESS_BOOK migration must independently throw.
    const mockData = {
      version: 17,
      data: createMockData('', encryptedAddressBook),
    };
    const migration = new StorageMigration018();

    await expect(migration.up(mockData, 'wrong_password')).rejects.toThrow(
      /cannot decrypt ADDRESS_BOOK/,
    );
  });

  it('up generates unique KDF_SALT per migration', async () => {
    const mockData1 = { version: 17, data: createMockData(encryptedSerialized) };
    const mockData2 = { version: 17, data: createMockData(encryptedSerialized) };

    const migration = new StorageMigration018();
    const result1 = await migration.up(mockData1, RAW_PASSWORD);
    const result2 = await migration.up(mockData2, RAW_PASSWORD);

    expect(result1.data.KDF_SALT).not.toBe(result2.data.KDF_SALT);
  });

  it('KDF_SALT round-trips correctly through Buffer (WalletRepository path)', async () => {
    const mockData = { version: 17, data: createMockData(encryptedSerialized) };
    const migration = new StorageMigration018();
    const result = await migration.up(mockData, RAW_PASSWORD);

    // Simulate how WalletRepository.getKdfSalt decodes the stored salt
    const saltViaBuffer = Uint8Array.from(Buffer.from(result.data.KDF_SALT, 'base64'));
    const parsed = JSON.parse(result.data.SERIALIZED);
    const decrypted = await decryptXChacha20(parsed, RAW_PASSWORD, saltViaBuffer);

    const wallet = JSON.parse(decrypted);
    expect(wallet).toHaveProperty('accounts');
    expect(wallet).toHaveProperty('keyrings');
  });

  it('clears ENCRYPTED_STORED_PASSWORD after successful migration', async () => {
    // The cipher pipeline changed under v018; the cached session password is
    // forced to clear so the user re-authenticates through the new path.
    const mockData = {
      version: 17,
      data: createMockData(
        encryptedSerialized,
        encryptedAddressBook,
        'previously-cached-session-token',
      ),
    };
    const migration = new StorageMigration018();
    const result = await migration.up(mockData, RAW_PASSWORD);

    expect(result.data.ENCRYPTED_STORED_PASSWORD).toBe('');
  });

  it('clears ENCRYPTED_STORED_PASSWORD on fresh-install migration too', async () => {
    const mockData = {
      version: 17,
      data: createMockData('', '', 'leftover-from-v017'),
    };
    const migration = new StorageMigration018();
    const result = await migration.up(mockData);

    expect(result.data.ENCRYPTED_STORED_PASSWORD).toBe('');
  });

  it('up fails with invalid data structure', async () => {
    const mockData: any = {
      version: 17,
      data: { ...createMockData(encryptedSerialized), SERIALIZED: null },
    };
    const migration = new StorageMigration018();

    await expect(migration.up(mockData)).rejects.toThrow(
      'Storage Data does not match version V017',
    );
  });
});
