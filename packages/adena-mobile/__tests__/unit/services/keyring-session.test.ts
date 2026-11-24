import { isAppError } from '../../../src/core/errors';
import { KeyPair } from '../../../src/crypto/key-pair';
import { KeyringRecord, KeyringType } from '../../../src/crypto/keyring';
import { KeyringSession } from '../../../src/services/keyring-session';
import { catchError } from '../../helpers/service-fakes';
import { TEST_MNEMONIC } from '../../helpers/test-container';

const HD: KeyringRecord = { id: 'hd', type: KeyringType.HD_WALLET, mnemonic: `  ${TEST_MNEMONIC.toUpperCase()} `, createdAt: 1 };
const PK: KeyringRecord = { id: 'pk', type: KeyringType.PRIVATE_KEY, privateKey: '1'.repeat(64), createdAt: 1 };

const codeOf = async (run: () => unknown) => {
  const error = await catchError(run);

  return isAppError(error) ? error.code : error;
};

describe('KeyringSession', () => {
  it('starts locked and refuses every key access', async () => {
    const session = new KeyringSession();

    expect(session.isUnlocked()).toBe(false);
    expect(await codeOf(() => session.add(PK))).toBe('WALLET_LOCKED');
    expect(await codeOf(() => session.getMnemonic('hd'))).toBe('WALLET_LOCKED');
    expect(await codeOf(() => session.withKeyPair('hd', 0, async () => 1))).toBe('WALLET_LOCKED');
  });

  it('opens with records, even an empty list', () => {
    const session = new KeyringSession();

    session.open([]);
    expect(session.isUnlocked()).toBe(true);
  });

  it('returns the normalized mnemonic of HD keyrings only', async () => {
    const session = new KeyringSession();

    session.open([HD, PK]);
    expect(session.getMnemonic('hd')).toBe(TEST_MNEMONIC);
    expect(await codeOf(() => session.getMnemonic('pk'))).toBe('INVALID_REQUEST');
    expect(await codeOf(() => session.getMnemonic('missing'))).toBe('WALLET_NOT_FOUND');
  });

  it('adds keyrings while unlocked', async () => {
    const session = new KeyringSession();

    session.open([HD]);
    session.add(PK);
    await expect(session.withKeyPair('pk', 99, async pair => pair.publicKey.length)).resolves.toBe(33);
  });

  it('re-opening replaces the previous keyrings', async () => {
    const session = new KeyringSession();

    session.open([HD]);
    session.open([PK]);
    expect(await codeOf(() => session.getMnemonic('hd'))).toBe('WALLET_NOT_FOUND');
  });

  it('wipes the private key after the task settles, also on failure', async () => {
    const session = new KeyringSession();
    let leaked: KeyPair | undefined;

    session.open([HD]);
    await session.withKeyPair('hd', 0, async (pair) => {
      leaked = pair;
      expect(pair.privateKey.some(byte => byte !== 0)).toBe(true);
    });
    expect(leaked?.privateKey.every(byte => byte === 0)).toBe(true);

    await expect(session.withKeyPair('hd', 1, async (pair) => {
      leaked = pair;
      throw new Error('task failed');
    })).rejects.toThrow('task failed');
    expect(leaked?.privateKey.every(byte => byte === 0)).toBe(true);
  });

  it('derives distinct keys per HD index and the same key for a single-key keyring', async () => {
    const session = new KeyringSession();

    session.open([HD, PK]);
    const hex = (pair: KeyPair) => Buffer.from(pair.publicKey).toString('hex');
    const hd0 = await session.withKeyPair('hd', 0, async pair => hex(pair));
    const hd1 = await session.withKeyPair('hd', 1, async pair => hex(pair));
    const pk0 = await session.withKeyPair('pk', 0, async pair => hex(pair));
    const pk5 = await session.withKeyPair('pk', 5, async pair => hex(pair));

    expect(hd0).not.toBe(hd1);
    expect(pk0).toBe(pk5);
  });

  it('closing locks the session and forgets every keyring', async () => {
    const session = new KeyringSession();

    session.open([HD]);
    session.close();
    expect(session.isUnlocked()).toBe(false);
    expect(await codeOf(() => session.getMnemonic('hd'))).toBe('WALLET_LOCKED');
    session.open([]);
    expect(await codeOf(() => session.getMnemonic('hd'))).toBe('WALLET_NOT_FOUND');
  });
});
