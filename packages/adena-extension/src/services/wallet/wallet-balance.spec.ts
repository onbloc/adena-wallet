import { GnoProvider } from '@common/provider/gno/gno-provider';
import { WalletBalanceService } from './wallet-balance';

/**
 * A transport failure is not a zero balance: a failed request must reject so the
 * query errors, and null is reserved for a response that is not an integer.
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
