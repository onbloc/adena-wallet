import { toBase64 } from '@cosmjs/encoding';

import { AppErrorCode, isAppError } from '../../../src/core/errors';
import { KeyringType } from '../../../src/crypto/keyring';
import { BACKUP_FORMAT, BACKUP_KDF_LIMITS, BACKUP_KDF_SETTINGS, BACKUP_VERSION, BackupCodec, BackupContent } from '../../../src/security/backup-codec';
import { ScryptXChaChaVaultCipher } from '../../../src/security/vault-cipher';
import { catchError } from '../../helpers/service-fakes';
import { createTestBackupCodec, TEST_MNEMONIC } from '../../helpers/test-container';

const BACKUP_PASSWORD = 'violet orbit lantern 42';
const PRIVATE_KEY = '1'.repeat(64);
const OTHER_MNEMONIC = 'legal winner thank year wave sausage worth useful legal winner thank yellow';
const cipher = new ScryptXChaChaVaultCipher({ N: 2 ** 10, r: 8, p: 1 });

const content = (overrides: Partial<BackupContent> = {}): BackupContent => ({
  version: BACKUP_VERSION,
  backupId: 'a'.repeat(32),
  createdAt: 1_700_000_000_000,
  revision: 1,
  keyrings: [
    { id: 'k1', type: KeyringType.HD_WALLET, mnemonic: TEST_MNEMONIC, createdAt: 1, accounts: [{ name: 'Main', hdIndex: 0 }, { name: 'Savings', hdIndex: 2 }] },
    { id: 'k2', type: KeyringType.PRIVATE_KEY, privateKey: PRIVATE_KEY, createdAt: 2, accounts: [{ name: 'Imported', hdIndex: 0 }] },
  ],
  ...overrides,
});

const codeOf = async (run: () => unknown): Promise<unknown> => {
  const error = await catchError(run);

  return isAppError(error) ? error.code : error;
};

// Encrypts any payload under a valid header, to test checks that run after decryption.
const sealRaw = async (payload: unknown, header: Partial<{ backupId: string; createdAt: number; version: number; revision: number }> = {}): Promise<string> => JSON.stringify({
  format: BACKUP_FORMAT,
  version: BACKUP_VERSION,
  backupId: 'a'.repeat(32),
  createdAt: 1_700_000_000_000,
  revision: 1,
  ...header,
  encryption: await cipher.encrypt(JSON.stringify(payload), BACKUP_PASSWORD),
});

describe('BackupCodec', () => {
  const codec = createTestBackupCodec();

  it('round-trips every keyring and account and keeps secrets out of the file', async () => {
    const raw = await codec.encode(content(), BACKUP_PASSWORD);

    expect(raw).not.toContain('abandon');
    expect(raw).not.toContain(PRIVATE_KEY);
    expect(raw).not.toContain('Savings');
    expect(JSON.parse(raw)).toMatchObject({ format: BACKUP_FORMAT, version: 3, backupId: 'a'.repeat(32), createdAt: 1_700_000_000_000, revision: 1 });
    await expect(codec.decode(raw, BACKUP_PASSWORD)).resolves.toEqual(content());
  });

  it('uses a costlier scrypt for the cloud file than the vault, bounded on read', () => {
    expect(BACKUP_KDF_SETTINGS).toEqual({ N: 2 ** 17, r: 8, p: 1 });
    expect(BACKUP_KDF_LIMITS.minN).toBeLessThanOrEqual(BACKUP_KDF_SETTINGS.N);
    expect(BACKUP_KDF_LIMITS.maxN).toBeGreaterThanOrEqual(BACKUP_KDF_SETTINGS.N);
    // 2^18 x r 8 = 256 MiB; anything larger risks an out-of-memory kill on a phone.
    expect(BACKUP_KDF_LIMITS.maxN).toBe(2 ** 18);
  });

  it('rejects a wrong password', async () => {
    const raw = await codec.encode(content(), BACKUP_PASSWORD);

    expect(await codeOf(() => codec.decode(raw, 'wrong password 1'))).toBe(AppErrorCode.INVALID_PASSWORD);
  });

  it('detects a modified ciphertext', async () => {
    const envelope = JSON.parse(await codec.encode(content(), BACKUP_PASSWORD));
    const bytes = Buffer.from(envelope.encryption.ciphertext, 'base64');

    bytes[5] ^= 0x01;
    envelope.encryption.ciphertext = toBase64(bytes);

    expect(await codeOf(() => codec.decode(JSON.stringify(envelope), BACKUP_PASSWORD))).toBe(AppErrorCode.INVALID_PASSWORD);
  });

  it('detects an edited plaintext header', async () => {
    const envelope = JSON.parse(await codec.encode(content(), BACKUP_PASSWORD));

    expect(await codeOf(() => codec.decode(JSON.stringify({ ...envelope, createdAt: 1 }), BACKUP_PASSWORD))).toBe(AppErrorCode.BACKUP_CORRUPTED);
    expect(await codeOf(() => codec.decode(JSON.stringify({ ...envelope, backupId: 'b'.repeat(32) }), BACKUP_PASSWORD))).toBe(AppErrorCode.BACKUP_CORRUPTED);
    // The revision is bound to the encrypted copy too, so it cannot be faked to hide another write.
    expect(await codeOf(() => codec.decode(JSON.stringify({ ...envelope, revision: 9 }), BACKUP_PASSWORD))).toBe(AppErrorCode.BACKUP_CORRUPTED);
    expect(() => codec.parseEnvelope(JSON.stringify({ ...envelope, revision: undefined }))).toThrow(expect.objectContaining({ code: AppErrorCode.BACKUP_CORRUPTED }));
  });

  it('refuses files from a newer app version and unknown versions', async () => {
    const envelope = JSON.parse(await codec.encode(content(), BACKUP_PASSWORD));

    expect(await codeOf(() => codec.decode(JSON.stringify({ ...envelope, version: 4 }), BACKUP_PASSWORD))).toBe(AppErrorCode.BACKUP_UNSUPPORTED_VERSION);
    expect(await codeOf(() => codec.decode(JSON.stringify({ ...envelope, version: 0 }), BACKUP_PASSWORD))).toBe(AppErrorCode.BACKUP_CORRUPTED);
    expect(await codeOf(async () => codec.decode(await sealRaw({ ...content(), version: 4 }), BACKUP_PASSWORD))).toBe(AppErrorCode.BACKUP_UNSUPPORTED_VERSION);
  });

  it('still decodes version 1 files, reading their revision as 0', async () => {
    const { revision: _revision, ...legacy } = content({ version: 1 });
    const raw = await sealRaw(legacy, { version: 1, revision: undefined });

    await expect(codec.decode(raw, BACKUP_PASSWORD)).resolves.toEqual({ ...legacy, revision: 0 });
    // A v1 header claiming a revision, or a v1 payload under a v2 header, is not accepted.
    expect(await codeOf(async () => codec.decode(await sealRaw(legacy, { version: 1, revision: 1 }), BACKUP_PASSWORD))).toBe(AppErrorCode.BACKUP_CORRUPTED);
    expect(await codeOf(async () => codec.decode(await sealRaw(legacy), BACKUP_PASSWORD))).toBe(AppErrorCode.BACKUP_CORRUPTED);
  });

  it('rejects KDF parameters outside the limits before deriving', async () => {
    const envelope = JSON.parse(await codec.encode(content(), BACKUP_PASSWORD));
    const strict = new BackupCodec(cipher);
    const withKdf = (kdf: object): string => JSON.stringify({ ...envelope, encryption: { ...envelope.encryption, kdf: { ...envelope.encryption.kdf, ...kdf } } });

    // A weakened (or test-strength) file is refused by the production limits.
    expect(await codeOf(() => strict.decode(JSON.stringify(envelope), BACKUP_PASSWORD))).toBe(AppErrorCode.BACKUP_CORRUPTED);
    expect(await codeOf(() => codec.decode(withKdf({ N: 2 ** 19 }), BACKUP_PASSWORD))).toBe(AppErrorCode.BACKUP_CORRUPTED);
    expect(await codeOf(() => codec.decode(withKdf({ N: 3000 }), BACKUP_PASSWORD))).toBe(AppErrorCode.BACKUP_CORRUPTED);
    expect(await codeOf(() => codec.decode(withKdf({ r: 1 }), BACKUP_PASSWORD))).toBe(AppErrorCode.BACKUP_CORRUPTED);
    expect(await codeOf(() => codec.decode(withKdf({ name: 'pbkdf2' }), BACKUP_PASSWORD))).toBe(AppErrorCode.BACKUP_CORRUPTED);
  });

  it('rejects damaged envelopes', () => {
    for (const raw of ['not json', '[]', JSON.stringify({ format: 'other', version: 1 }), JSON.stringify({ format: BACKUP_FORMAT, version: 1, backupId: 'x', createdAt: 1 })]) {
      expect(() => codec.parseEnvelope(raw)).toThrow(expect.objectContaining({ code: AppErrorCode.BACKUP_CORRUPTED }));
    }
  });

  it('rejects a malformed salt, nonce or ciphertext as damaged, before deriving', async () => {
    const envelope = JSON.parse(await codec.encode(content(), BACKUP_PASSWORD));
    const derive = jest.spyOn(cipher, 'decrypt');
    const withEncryption = (patch: object): string => JSON.stringify({ ...envelope, encryption: { ...envelope.encryption, ...patch } });
    const nonce = (value: string) => withEncryption({ cipher: { ...envelope.encryption.cipher, nonce: value } });

    for (const raw of [
      nonce(envelope.encryption.cipher.nonce.slice(4)),
      nonce(toBase64(new Uint8Array(12))),
      nonce('not base64 at all'),
      withEncryption({ ciphertext: toBase64(new Uint8Array(16)) }),
      withEncryption({ ciphertext: 42 }),
      withEncryption({ kdf: { ...envelope.encryption.kdf, salt: toBase64(new Uint8Array(4)) } }),
    ]) {
      expect(await codeOf(() => codec.decode(raw, BACKUP_PASSWORD))).toBe(AppErrorCode.BACKUP_CORRUPTED);
    }

    expect(derive).not.toHaveBeenCalled();
    derive.mockRestore();
  });

  it('bounds account indices, counts, names and the stored layout before any restore', async () => {
    const hd = content().keyrings[0];
    const accounts = (count: number) => Array.from({ length: count }, (_, hdIndex) => ({ name: `A${hdIndex}`, hdIndex }));
    const bad: unknown[] = [
      // 2^31 and above are hardened indices (2^32 throws inside the derivation).
      { ...content(), keyrings: [{ ...hd, accounts: [{ name: 'A', hdIndex: 2 ** 31 }] }] },
      { ...content(), keyrings: [{ ...hd, accounts: [{ name: 'A', hdIndex: 2 ** 32 }] }] },
      { ...content(), keyrings: [{ ...hd, accounts: [{ name: 'A', hdIndex: 1.5 }] }] },
      { ...content(), keyrings: [{ ...hd, accounts: accounts(1001) }] },
      { ...content(), keyrings: [{ ...hd, accounts: [{ name: 'x'.repeat(257), hdIndex: 0 }] }] },
      { ...content(), keyrings: [{ ...hd, accounts: [{ name: 'A', hdIndex: 0, position: 0 }, { name: 'B', hdIndex: 1 }] }] },
      { ...content(), keyrings: [{ ...hd, accounts: [{ name: 'A', hdIndex: 0, position: 1 }, { name: 'B', hdIndex: 1, position: 1 }] }] },
      { ...content(), keyrings: [{ ...hd, accounts: [{ name: 'A', hdIndex: 0, avatarColor: 7 }] }] },
      { ...content(), selected: { keyringId: 'k1', hdIndex: 5 } },
      { ...content(), selected: { keyringId: 'k1', hdIndex: '0' } },
    ];

    for (const payload of bad) {
      expect(await codeOf(async () => codec.decode(await sealRaw(payload), BACKUP_PASSWORD))).toBe(AppErrorCode.BACKUP_CORRUPTED);
    }

    const valid = content({
      selected: { keyringId: 'k2', hdIndex: 0 },
      keyrings: [
        { ...hd, accounts: [{ name: 'Main', hdIndex: 0, position: 0 }, { name: 'Last', hdIndex: 2 ** 31 - 1, position: 2, avatarColor: 'violet' }] },
        { ...content().keyrings[1], accounts: [{ name: 'Imported', hdIndex: 0, position: 1 }] },
      ],
    });

    await expect(codec.decode(await codec.encode(valid, BACKUP_PASSWORD), BACKUP_PASSWORD)).resolves.toEqual(valid);
  });

  it('validates the decrypted keyrings', async () => {
    const hd = content().keyrings[0];
    const bad: unknown[] = [
      'not an object',
      { ...content(), keyrings: [] },
      { ...content(), keyrings: [{ ...hd, mnemonic: 'abandon abandon' }] },
      { ...content(), keyrings: [{ ...hd, accounts: [{ name: 'A', hdIndex: 0 }, { name: 'B', hdIndex: 0 }] }] },
      { ...content(), keyrings: [{ ...hd, accounts: [{ name: 'A', hdIndex: -1 }] }] },
      { ...content(), keyrings: [hd, { ...hd, id: 'k3' }] },
      { ...content(), keyrings: [hd, { ...hd, mnemonic: OTHER_MNEMONIC }] },
      { ...content(), keyrings: [{ id: 'k2', type: KeyringType.PRIVATE_KEY, privateKey: PRIVATE_KEY, createdAt: 2, accounts: [{ name: 'A', hdIndex: 1 }] }] },
      { ...content(), keyrings: [{ id: 'k2', type: KeyringType.PRIVATE_KEY, privateKey: 'zz', createdAt: 2, accounts: [{ name: 'A', hdIndex: 0 }] }] },
    ];

    for (const payload of bad) {
      expect(await codeOf(async () => codec.decode(await sealRaw(payload), BACKUP_PASSWORD))).toBe(AppErrorCode.BACKUP_CORRUPTED);
    }

    expect(await codeOf(async () => codec.decode(
      JSON.stringify({ ...JSON.parse(await sealRaw('x')), encryption: await cipher.encrypt('not json', BACKUP_PASSWORD) }),
      BACKUP_PASSWORD,
    ))).toBe(AppErrorCode.BACKUP_CORRUPTED);
  });

  it('accepts a keyring without accounts only from version 3 on', async () => {
    const [hd, pk] = content().keyrings;
    const withoutAccounts = content({ keyrings: [hd, { ...pk, accounts: [] }] });

    await expect(codec.decode(await codec.encode(withoutAccounts, BACKUP_PASSWORD), BACKUP_PASSWORD)).resolves.toEqual(withoutAccounts);

    for (const keyrings of [[{ ...hd, accounts: [] }], [hd, { ...pk, accounts: [] }]]) {
      expect(await codeOf(async () => codec.decode(await sealRaw({ ...content(), version: 2, keyrings }, { version: 2 }), BACKUP_PASSWORD))).toBe(AppErrorCode.BACKUP_CORRUPTED);
    }

    // A version 2 file with the old placeholder row still decodes.
    const legacy = { ...content(), version: 2, keyrings: [hd, { ...pk, accounts: [{ name: '', hdIndex: 0 }] }] };

    await expect(codec.decode(await sealRaw(legacy, { version: 2 }), BACKUP_PASSWORD)).resolves.toEqual(legacy);
  });

  it('refuses to encode invalid content', async () => {
    expect(await codeOf(() => codec.encode(content({ keyrings: [] }), BACKUP_PASSWORD))).toBe(AppErrorCode.BACKUP_CORRUPTED);
  });
});
