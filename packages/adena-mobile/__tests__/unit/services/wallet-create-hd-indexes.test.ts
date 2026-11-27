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
});
