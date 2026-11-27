import { isAppError } from '../../../src/core/errors';
import { createTestContainer, TEST_MNEMONIC, TEST_PASSWORD } from '../../helpers/test-container';

describe('WalletService.createWallet with picked HD indexes', () => {
  it('adds an account at each index, named by index, and selects the first', async () => {
    const { container } = createTestContainer();
    const first = await container.walletService.createWallet({ mnemonic: TEST_MNEMONIC, password: TEST_PASSWORD, hdIndexes: [0, 4, 9] });
    const accounts = container.accountService.getAccounts();

    expect(first).toMatchObject({ hdIndex: 0, name: 'Account 1' });
    expect(accounts.map(account => [account.hdIndex, account.name])).toEqual([[0, 'Account 1'], [4, 'Account 5'], [9, 'Account 10']]);
    expect(new Set(accounts.map(account => account.keyringId)).size).toBe(1);
    expect(container.accountService.getCurrentAccount()?.id).toBe(first.id);
  });

  it('starts at a picked index other than 0', async () => {
    const { container } = createTestContainer();
    const first = await container.walletService.createWallet({ mnemonic: TEST_MNEMONIC, password: TEST_PASSWORD, hdIndexes: [3] });

    expect(first).toMatchObject({ hdIndex: 3, name: 'Account 4' });
  });

  it('falls back to index 0 for an empty list', async () => {
    const { container } = createTestContainer();
    const first = await container.walletService.createWallet({ mnemonic: TEST_MNEMONIC, password: TEST_PASSWORD, hdIndexes: [] });

    expect(first).toMatchObject({ hdIndex: 0, name: 'Account 1' });
  });

  it.each([[[0, 0]], [[-1]], [[1.5]], [[2 ** 31]]])('rejects %j without writing a vault', async (hdIndexes) => {
    const { container } = createTestContainer();
    const error = await container.walletService.createWallet({ mnemonic: TEST_MNEMONIC, password: TEST_PASSWORD, hdIndexes }).catch(caught => caught);

    expect(isAppError(error, 'INVALID_REQUEST')).toBe(true);
    expect(await container.walletService.getStatus()).toBe('empty');
  });

  it('removes the new wallet when a later account cannot be added', async () => {
    const { container } = createTestContainer();
    const append = container.accountService.appendAccount.bind(container.accountService);

    jest.spyOn(container.accountService, 'appendAccount').mockImplementation(async (...args) => {
      if (args[3]?.hdIndex === 4) {
        throw new Error('locked meanwhile');
      }

      return append(...args);
    });

    await expect(container.walletService.createWallet({ mnemonic: TEST_MNEMONIC, password: TEST_PASSWORD, hdIndexes: [0, 4] })).rejects.toThrow('locked meanwhile');
    expect(await container.walletService.getStatus()).toBe('empty');
    expect(container.accountService.getAccounts()).toEqual([]);
  });

  it('rebuilds the picked indexes from the vault when the account list is lost', async () => {
    const { container } = createTestContainer();

    await container.walletService.createWallet({ mnemonic: TEST_MNEMONIC, password: TEST_PASSWORD, hdIndexes: [2, 7] });
    const before = container.accountService.getAccounts().map(account => [account.hdIndex, account.publicKey]);

    // e.g. an iOS reinstall: general storage is gone, the Keychain vault survives.
    container.walletService.lock();
    container.accountService.clear();
    await container.walletService.unlock(TEST_PASSWORD);

    expect(container.accountService.getAccounts().map(account => [account.hdIndex, account.publicKey])).toEqual(before);
    expect(container.accountService.getAccounts().map(account => account.name)).toEqual(['Account 3', 'Account 8']);
  });

  it('keeps the rebuild retryable when it is interrupted', async () => {
    const { container } = createTestContainer();

    await container.walletService.createWallet({ mnemonic: TEST_MNEMONIC, password: TEST_PASSWORD, hdIndexes: [2, 7] });
    container.walletService.lock();
    container.accountService.clear();

    const session = (container.accountService as unknown as { keyringSession: { withKeyPair: (...args: unknown[]) => Promise<unknown> } }).keyringSession;
    const real = session.withKeyPair.bind(session);
    // The first index derives, the second is cut off.
    const derive = jest.spyOn(session, 'withKeyPair').mockImplementationOnce(real).mockRejectedValueOnce(new Error('interrupted'));

    await expect(container.walletService.unlock(TEST_PASSWORD)).rejects.toThrow('interrupted');
    expect(container.accountService.getAccounts()).toEqual([]);

    derive.mockRestore();
    await container.walletService.unlock(TEST_PASSWORD);
    expect(container.accountService.getAccounts().map(account => account.hdIndex)).toEqual([2, 7]);
  });
});
