import { WalletError, WalletErrorCode, type WalletSdk } from '../../agent';
import { MockWalletSdk } from '../wallet/mockWalletSdk';
import { TokenSymbol } from '../wallet/tokens';
import { ACCOUNT, CAROL, GNS_PATH } from './fixture';

/**
 * The wallet the app's benchmark runs on: the mock wallet holding the fixture balances (10 GNOT,
 * 250 GNS) with carol as its contact. Like the Adena wallet it refuses an approval of the native
 * token, so a scenario that expects that refusal measures the model, not the mock.
 */
export function createBenchmarkWallet(): WalletSdk {
  const mock = new MockWalletSdk({
    accounts: [
      { name: 'Benchmark', address: ACCOUNT, balances: { [TokenSymbol.Gnot]: '10', [TokenSymbol.Gns]: '250' } },
    ],
    contacts: [{ alias: 'carol', address: CAROL }],
  });
  return {
    getContacts: () => mock.getContacts(),
    transfer: async (params) => {
      const prepared = await mock.transfer(params);
      return prepared.summary.token === TokenSymbol.Gns
        ? { ...prepared, summary: { ...prepared.summary, packagePath: GNS_PATH } }
        : prepared;
    },
    approve: async (params) => {
      if (params.token.trim().toLowerCase() === TokenSymbol.Gnot.toLowerCase()) {
        throw new WalletError(WalletErrorCode.UnsupportedToken, `${TokenSymbol.Gnot} is the native token: it has no allowance`);
      }
      const prepared = await mock.approve(params);
      return { ...prepared, summary: { ...prepared.summary, packagePath: GNS_PATH } };
    },
  };
}
