import { WalletBalanceService } from './wallet-balance';

/**
 * A TRANSPORT FAILURE IS NOT A ZERO BALANCE.
 *
 * getGnotTokenBalance used to end `.catch(() => null)`, and its callers render
 * `${balanceAmount || 0}`. A failed RPC call therefore arrived at the UI as a
 * confident "0 GNOT" — indistinguishable from an account that genuinely holds
 * nothing, and produced while offline, when no balance had been read at all.
 *
 * The distinction these tests pin:
 *   - the request fails      -> reject, so the query errors and the UI can warn
 *   - the response is absurd -> null, a real answer this method cannot convert
 */
const makeService = (getBalance: jest.Mock): WalletBalanceService => {
  const provider = { getBalance };
  const service = new WalletBalanceService({} as never);
  // The provider is resolved through a private getter; substituting it keeps
  // this a unit test of the failure contract rather than of network plumbing.
  (service as unknown as { getGnoProvider: () => unknown }).getGnoProvider = (): unknown =>
    provider;
  return service;
};

describe('WalletBalanceService.getGnotTokenBalance', () => {
  it('rejects when the request fails, rather than reporting a zero balance', async () => {
    const boom = new Error('network unreachable');
    const service = makeService(jest.fn().mockRejectedValue(boom));

    await expect(service.getGnotTokenBalance('g1abc')).rejects.toThrow('network unreachable');
  });

  it('returns the converted amount when the request succeeds', async () => {
    const service = makeService(jest.fn().mockResolvedValue('1500000'));

    // 6 decimals: 1_500_000 ugnot is 1.5 GNOT.
    await expect(service.getGnotTokenBalance('g1abc')).resolves.toBe(1.5);
  });

  it('reports zero as zero, which must stay distinguishable from a failure', async () => {
    const service = makeService(jest.fn().mockResolvedValue('0'));

    await expect(service.getGnotTokenBalance('g1abc')).resolves.toBe(0);
  });

  it('returns null for a non-integer response, the one case null still means', async () => {
    const service = makeService(jest.fn().mockResolvedValue('not-a-number'));

    await expect(service.getGnotTokenBalance('g1abc')).resolves.toBeNull();
  });
});
