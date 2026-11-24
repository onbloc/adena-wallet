import { fromBase64, toBase64 } from '@cosmjs/encoding';

import { isAppError } from '../../../src/core/errors';
import { KeyringType } from '../../../src/crypto/keyring';
import { AvatarColor } from '../../../src/domain/account';
import { StorageAccountRepository } from '../../../src/repositories/account.repository';
import { AccountService } from '../../../src/services/account.service';
import { KeyringSession } from '../../../src/services/keyring-session';
import { MemoryKeyValueStore } from '../../../src/storage/memory-key-value-store';
import { catchError, createFakeRegistry, fakeAddress, GNO_NETWORK, makeAccount } from '../../helpers/service-fakes';
import { TEST_MNEMONIC } from '../../helpers/test-container';

const PRIVATE_KEY = '1'.repeat(64);

const setup = ({ unlocked = true } = {}) => {
  const store = new MemoryKeyValueStore();
  const repository = new StorageAccountRepository(store);
  const session = new KeyringSession();
  const { registry } = createFakeRegistry();

  if (unlocked) {
    session.open([
      { id: 'hd', type: KeyringType.HD_WALLET, mnemonic: TEST_MNEMONIC, createdAt: 1 },
      { id: 'pk', type: KeyringType.PRIVATE_KEY, privateKey: PRIVATE_KEY, createdAt: 1 },
    ]);
  }

  return { service: new AccountService(repository, session, registry), repository, session };
};

describe('AccountService', () => {
  describe('reading accounts', () => {
    it('starts empty with no current account', () => {
      const { service } = setup();

      expect(service.getAccounts()).toEqual([]);
      expect(service.getCurrentAccount()).toBeNull();
    });

    it('throws WALLET_NOT_FOUND for an unknown id', () => {
      const { service } = setup();
      let error: unknown;

      try {
        service.getAccount('missing');
      }
      catch (caught) {
        error = caught;
      }

      expect(isAppError(error, 'WALLET_NOT_FOUND')).toBe(true);
    });

    it('falls back to the first account when the current id is unknown', () => {
      const { service, repository } = setup();
      const a = makeAccount({ id: 'a' });
      const b = makeAccount({ id: 'b' });

      repository.saveAccounts([a, b]);
      expect(service.getCurrentAccount()).toEqual(a);
      repository.setCurrentAccountId('b');
      expect(service.getCurrentAccount()).toEqual(b);
      repository.setCurrentAccountId('gone');
      expect(service.getCurrentAccount()).toEqual(a);
    });
  });

  describe('selectAccount', () => {
    it('stores the selected account', () => {
      const { service, repository } = setup();

      repository.saveAccounts([makeAccount({ id: 'a' }), makeAccount({ id: 'b' })]);
      expect(service.selectAccount('b').id).toBe('b');
      expect(repository.getCurrentAccountId()).toBe('b');
    });

    it('rejects unknown accounts without changing the selection', () => {
      const { service, repository } = setup();

      repository.saveAccounts([makeAccount({ id: 'a' })]);
      repository.setCurrentAccountId('a');
      expect(() => service.selectAccount('nope')).toThrow();
      expect(repository.getCurrentAccountId()).toBe('a');
    });
  });

  it('derives addresses through the network chain', () => {
    const { service } = setup();
    const account = makeAccount();
    const expected = fakeAddress(fromBase64(account.publicKey), GNO_NETWORK);

    expect(service.getAddress(account, GNO_NETWORK)).toBe(expected);
    expect(service.withAddress(account, GNO_NETWORK)).toEqual({ ...account, address: expected });
  });

  describe('createAccount', () => {
    it('derives sequential HD indexes, names and selects the first account', async () => {
      const { service, repository } = setup();
      const first = await service.createAccount('hd', KeyringType.HD_WALLET);
      const second = await service.createAccount('hd', KeyringType.HD_WALLET, '  Savings  ');
      const third = await service.createAccount('hd', KeyringType.HD_WALLET, '   ');

      expect([first.hdIndex, second.hdIndex, third.hdIndex]).toEqual([0, 1, 2]);
      expect([first.name, second.name, third.name]).toEqual(['Account 1', 'Savings', 'Account 3']);
      expect(new Set([first.publicKey, second.publicKey, third.publicKey]).size).toBe(3);
      expect(fromBase64(first.publicKey)).toHaveLength(33);
      expect(repository.getCurrentAccountId()).toBe(first.id);
      expect(service.getAccounts()).toHaveLength(3);
    });

    it('continues after the highest index when accounts were removed', async () => {
      const { service } = setup();
      const first = await service.createAccount('hd', KeyringType.HD_WALLET);

      await service.createAccount('hd', KeyringType.HD_WALLET);
      const third = await service.createAccount('hd', KeyringType.HD_WALLET);

      service.removeAccount(first.id);
      expect((await service.createAccount('hd', KeyringType.HD_WALLET)).hdIndex).toBe(third.hdIndex + 1);
    });

    it('allows exactly one account for single-key keyrings', async () => {
      const { service } = setup();
      const account = await service.createAccount('pk', KeyringType.PRIVATE_KEY);

      expect(account).toMatchObject({ hdIndex: 0, keyringType: 'PRIVATE_KEY' });
      expect(isAppError(await catchError(() => service.createAccount('pk', KeyringType.PRIVATE_KEY)), 'INVALID_REQUEST')).toBe(true);
    });

    it('does not move an existing selection', async () => {
      const { service, repository } = setup();
      const first = await service.createAccount('hd', KeyringType.HD_WALLET);

      await service.createAccount('pk', KeyringType.PRIVATE_KEY);
      expect(repository.getCurrentAccountId()).toBe(first.id);
    });

    it('requires an unlocked session', async () => {
      const { service } = setup({ unlocked: false });

      expect(isAppError(await catchError(() => service.createAccount('hd', KeyringType.HD_WALLET)), 'WALLET_LOCKED')).toBe(true);
      expect(service.getAccounts()).toEqual([]);
    });

    it('fails for a keyring that is not loaded', async () => {
      const { service } = setup();

      expect(isAppError(await catchError(() => service.createAccount('unknown', KeyringType.HD_WALLET)), 'WALLET_NOT_FOUND')).toBe(true);
    });
  });

  it('detects duplicate public keys', async () => {
    const { service } = setup();
    const account = await service.createAccount('hd', KeyringType.HD_WALLET);

    expect(service.isDuplicatePublicKey(account.publicKey)).toBe(true);
    expect(service.isDuplicatePublicKey(toBase64(new Uint8Array(33)))).toBe(false);
  });

  describe('renameAccount', () => {
    it('trims and persists the new name', () => {
      const { service, repository } = setup();

      repository.saveAccounts([makeAccount({ id: 'a' }), makeAccount({ id: 'b', name: 'Other' })]);
      expect(service.renameAccount('a', '  Main  ').name).toBe('Main');
      expect(service.getAccount('a').name).toBe('Main');
      expect(service.getAccount('b').name).toBe('Other');
    });

    it('rejects a blank name', () => {
      const { service, repository } = setup();

      repository.saveAccounts([makeAccount({ id: 'a' })]);
      expect(() => service.renameAccount('a', '   ')).toThrow('Account name is required');
    });

    it('rejects an unknown account', () => {
      const { service } = setup();

      expect(() => service.renameAccount('nope', 'Name')).toThrow('Account nope not found');
    });
  });

  describe('updateProfile', () => {
    it('saves the name and avatar color and keeps the color when omitted', () => {
      const { service, repository } = setup();

      repository.saveAccounts([makeAccount({ id: 'a' })]);
      expect(service.updateProfile('a', { name: ' Main ', avatarColor: AvatarColor.TEAL })).toMatchObject({ name: 'Main', avatarColor: 'teal' });
      expect(service.updateProfile('a', { name: 'Renamed' })).toMatchObject({ name: 'Renamed', avatarColor: 'teal' });
      expect(service.renameAccount('a', 'Again').avatarColor).toBe('teal');
    });

    it('rejects an unknown color, a blank name and an unknown account', () => {
      const { service, repository } = setup();

      repository.saveAccounts([makeAccount({ id: 'a' })]);
      expect(() => service.updateProfile('a', { name: 'Main', avatarColor: 'neon' as AvatarColor })).toThrow('Unknown avatar color');
      expect(() => service.updateProfile('a', { name: ' ' })).toThrow('Account name is required');
      expect(() => service.updateProfile('nope', { name: 'Main' })).toThrow('Account nope not found');
      expect(service.getAccount('a').avatarColor).toBeUndefined();
    });
  });

  describe('removeAccount', () => {
    it('refuses to remove the last account', () => {
      const { service, repository } = setup();

      repository.saveAccounts([makeAccount({ id: 'a' })]);
      expect(() => service.removeAccount('a')).toThrow('The last account cannot be removed');
      expect(service.getAccounts()).toHaveLength(1);
    });

    it('refuses an unknown account', () => {
      const { service, repository } = setup();

      repository.saveAccounts([makeAccount({ id: 'a' }), makeAccount({ id: 'b' })]);
      expect(() => service.removeAccount('nope')).toThrow();
      expect(service.getAccounts()).toHaveLength(2);
    });

    it('moves the selection when the selected account is removed', () => {
      const { service, repository } = setup();

      repository.saveAccounts([makeAccount({ id: 'a' }), makeAccount({ id: 'b', keyringId: 'other' }), makeAccount({ id: 'c' })]);
      repository.setCurrentAccountId('a');
      expect(service.removeAccount('a')).toEqual({ removed: expect.objectContaining({ id: 'a' }), keyringEmpty: false });
      expect(repository.getCurrentAccountId()).toBe('b');
    });

    it('keeps the selection when another account is removed and reports an emptied keyring', () => {
      const { service, repository } = setup();

      repository.saveAccounts([makeAccount({ id: 'a' }), makeAccount({ id: 'b', keyringId: 'other' })]);
      repository.setCurrentAccountId('a');
      expect(service.removeAccount('b').keyringEmpty).toBe(true);
      expect(repository.getCurrentAccountId()).toBe('a');
      expect(service.getAccounts().map(account => account.id)).toEqual(['a']);
    });
  });

  it('clears every account', () => {
    const { service, repository } = setup();

    repository.saveAccounts([makeAccount()]);
    repository.setCurrentAccountId('account-1');
    service.clear();
    expect(service.getAccounts()).toEqual([]);
    expect(service.getCurrentAccount()).toBeNull();
  });
});
