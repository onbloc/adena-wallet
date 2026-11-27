import type { WalletSdk } from '../../agent';
import { MockWalletSdk } from '../wallet/mockWalletSdk';
import { TokenSymbol } from '../wallet/tokens';
import { ACCOUNT, CAROL } from './fixture';

/**
 * The wallet the app's benchmark runs on: the mock wallet holding the fixture balances (10 GNOT,
 * 250 GNS) with carol as its contact. Native allowances are refused by the mock itself.
 */
export function createBenchmarkWallet(): WalletSdk {
  return new MockWalletSdk({
    accounts: [
      { name: 'Benchmark', address: ACCOUNT, balances: { [TokenSymbol.Gnot]: '10', [TokenSymbol.Gns]: '250' } },
    ],
    contacts: [{ alias: 'carol', address: CAROL }],
  });
}
