import { HdAccountPreview } from '../../../src/services/hd-account-preview';
import { createTestContainer, TEST_MNEMONIC, TEST_PASSWORD } from '../../helpers/test-container';

describe('HdAccountPreview', () => {
  it('derives the addresses the wallet creates at the same indexes', async () => {
    const { container } = createTestContainer();
    const network = container.networkService.getCurrentNetwork();
    const preview = new HdAccountPreview(TEST_MNEMONIC, container.chainRegistry, network);
    const candidates = await preview.derive(2, 3);

    expect(candidates.map(candidate => candidate.hdIndex)).toEqual([2, 3, 4]);
    expect(new Set(candidates.map(candidate => candidate.address)).size).toBe(3);

    await container.walletService.createWallet({ mnemonic: TEST_MNEMONIC, password: TEST_PASSWORD, hdIndexes: [2, 3, 4] });
    const created = container.accountService.getAccounts().map(account => container.accountService.getAddress(account, network));

    expect(candidates.map(candidate => candidate.address)).toEqual(created);
    preview.destroy();
  });

  it('reads the native balance and reports an unreachable chain as null', async () => {
    const { container, gno } = createTestContainer();
    const network = container.networkService.getCurrentNetwork();
    const preview = new HdAccountPreview(TEST_MNEMONIC, container.chainRegistry, network);
    const [first] = await preview.derive(0, 1);

    gno.state.balances[first.address] = '2500000ugnot';
    await expect(preview.getNativeBalance(first.address)).resolves.toMatchObject({ amount: '2500000', symbol: network.nativeToken.symbol });

    jest.spyOn(container.chainRegistry.forNetwork(network), 'getNativeBalance').mockRejectedValue(new Error('offline'));
    await expect(preview.getNativeBalance(first.address)).resolves.toBeNull();
    preview.destroy();
  });

  it('stops deriving and wipes the seed again once destroyed mid-derive', async () => {
    const { container } = createTestContainer();
    const preview = new HdAccountPreview(TEST_MNEMONIC, container.chainRegistry, container.networkService.getCurrentNetwork());
    const pending = preview.derive(0, 5);

    preview.destroy();
    const keyring = (preview as unknown as { keyring: { seed: Uint8Array | null } }).keyring;

    expect(await pending).toEqual([]);
    expect(keyring.seed).toBeNull();
  });
});
