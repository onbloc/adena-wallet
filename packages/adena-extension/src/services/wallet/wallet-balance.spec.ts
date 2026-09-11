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

describe('WalletBalanceService.getGRC20TokenBalanceMap across registry versions', () => {
  const ADDRESS = 'g1abc';
  const V1_REGISTRY = 'gno.land/r/demo/defi/grc20reg/v1';
  const V0_REGISTRY = 'gno.land/r/nt/grc20reg/v0';
  const NEW_TOKEN = 'gno.land/r/x/new.NEW';
  const OLD_TOKEN = 'gno.land/r/x/old.OLD';

  // Each registry only "holds" some tokens: the qeval returns (found, balance)
  // pairs in chunk order, and a token missing from a registry reads as
  // (false 0) so it is forwarded to the next version.
  const registries: Record<string, Record<string, string>> = {
    [V1_REGISTRY]: { [NEW_TOKEN]: '100' },
    [V0_REGISTRY]: { [OLD_TOKEN]: '7' },
  };

  const evaluateIIFE = jest.fn(async (registryPath: string, options: { statements: string[] }) => {
    const held = registries[registryPath];
    if (!held) {
      throw new Error('unknown package');
    }
    const keys = options.statements
      .map((statement) => statement.match(/Get\("([^"]+)"\)/)?.[1])
      .filter((key): key is string => !!key);
    return keys
      .map((key) => (held[key] ? `(true bool)\n(${held[key]} int64)` : '(false bool)\n(0 int64)'))
      .join('\n');
  });

  const service = new WalletBalanceService();
  service.setGnoProvider({ evaluateIIFE } as unknown as GnoProvider);

  beforeEach(() => evaluateIIFE.mockClear());

  it('resolves each token from the first registry version that holds it', async () => {
    service.setRegistryPaths([V1_REGISTRY, V0_REGISTRY]);

    const balances = await service.getGRC20TokenBalanceMap(ADDRESS, [NEW_TOKEN, OLD_TOKEN]);

    expect(balances).toEqual({ [NEW_TOKEN]: 100n, [OLD_TOKEN]: 7n });
    // v1 was asked for both, v0 only for the token v1 did not hold.
    expect(evaluateIIFE).toHaveBeenCalledTimes(2);
    expect(evaluateIIFE.mock.calls[0][0]).toBe(V1_REGISTRY);
    expect(evaluateIIFE.mock.calls[1][0]).toBe(V0_REGISTRY);
    expect(evaluateIIFE.mock.calls[1][1].statements.join(' ')).not.toContain(NEW_TOKEN);
  });

  it('skips a registry version that is not deployed and continues with the next', async () => {
    service.setRegistryPaths(['gno.land/r/demo/defi/grc20reg/v9', V0_REGISTRY]);

    const balances = await service.getGRC20TokenBalanceMap(ADDRESS, [OLD_TOKEN]);

    expect(balances).toEqual({ [OLD_TOKEN]: 7n });
  });
});
