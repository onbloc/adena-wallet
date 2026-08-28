import { GnoProvider } from '@common/provider/gno/gno-provider';
import { WalletBalanceService } from './wallet-balance';

/**
 * A TRANSPORT FAILURE IS NOT A ZERO BALANCE.
 *
 * getGnotTokenBalance used to end `.catch(() => null)`, and its callers render
 * `${balanceAmount || 0}`. A failed RPC call therefore reached the UI as a
 * confident "0 GNOT" — indistinguishable from an account that genuinely holds
 * nothing, and produced while offline, when no balance had been read at all.
 *
 * What these pin:
 *   - the request fails      -> reject, so the query errors and the UI can warn
 *   - the response is absurd -> null, a real answer this method cannot convert
 */
const serviceWith = (getBalance: jest.Mock): WalletBalanceService => {
  const service = new WalletBalanceService();
  service.setGnoProvider({ getBalance } as unknown as GnoProvider);
  return service;
};

describe('WalletBalanceService.getGnotTokenBalance', () => {
  it('rejects when the request fails, rather than reporting a zero balance', async () => {
    const service = serviceWith(jest.fn().mockRejectedValue(new Error('network unreachable')));

    await expect(service.getGnotTokenBalance('g1abc')).rejects.toThrow('network unreachable');
  });

  it('returns the converted amount when the request succeeds', async () => {
    // 6 decimals: 1_500_000 ugnot is 1.5 GNOT.
    const service = serviceWith(jest.fn().mockResolvedValue('1500000'));

    await expect(service.getGnotTokenBalance('g1abc')).resolves.toBe(1.5);
  });

  it('reports zero as zero, which must stay distinguishable from a failure', async () => {
    const service = serviceWith(jest.fn().mockResolvedValue('0'));

    await expect(service.getGnotTokenBalance('g1abc')).resolves.toBe(0);
  });

  it('returns null for a non-integer response, the one case null still means', async () => {
    const service = serviceWith(jest.fn().mockResolvedValue('not-a-number'));

    await expect(service.getGnotTokenBalance('g1abc')).resolves.toBeNull();
  });
});
