import { WalletError, WalletErrorCode } from '../../../agent';
import { createBenchmarkWallet } from '../benchmarkWallet';
import { ACCOUNT, CAROL } from '../fixture';

describe('benchmark wallet', () => {
  it('knows carol and holds the fixture balances', async () => {
    const wallet = createBenchmarkWallet();

    expect(await wallet.getContacts?.()).toEqual([{ alias: 'carol', address: CAROL }]);
    await expect(wallet.transfer({ from: ACCOUNT, to: CAROL, amount: '10', token: 'GNOT' })).resolves.toBeDefined();
    await expect(wallet.transfer({ from: ACCOUNT, to: CAROL, amount: '10.5', token: 'GNOT' })).rejects.toMatchObject({
      code: WalletErrorCode.InsufficientBalance,
    });
  });

  it('refuses an approval of the native token in any case', async () => {
    const wallet = createBenchmarkWallet();

    for (const token of ['GNOT', 'gnot', ' Gnot ']) {
      const error = await wallet.approve!({ from: ACCOUNT, spender: CAROL, amount: '5', token }).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(WalletError);
      expect(error).toMatchObject({ code: WalletErrorCode.UnsupportedToken });
    }
  });

  it('prepares an approval of a GRC20 token', async () => {
    const { summary } = await createBenchmarkWallet().approve!({ from: ACCOUNT, spender: CAROL, amount: '10', token: 'GNS' });

    expect(summary).toMatchObject({ from: ACCOUNT, spender: CAROL, amount: '10', token: 'GNS' });
  });
});
