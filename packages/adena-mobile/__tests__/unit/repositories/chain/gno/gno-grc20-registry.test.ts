import { GnoGrc20Registry } from '../../../../../src/repositories/chain/gno/gno-grc20-registry';
import { BUILT_IN_NETWORKS } from '../../../../../src/resources';
import { createFakeGnoProvider } from '../../../../helpers/fake-gno-provider';

const network = BUILT_IN_NETWORKS[0];
const FOO = 'gno.land/r/demo/foo.FOO';
const BAR = 'gno.land/r/demo/bar.BAR';
const OWNER = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';

const setup = (evaluate: (pkgPath: string, expression: string) => string) => {
  const calls: { pkgPath: string; expression: string }[] = [];
  const fake = createFakeGnoProvider({
    evaluate: (pkgPath, expression) => {
      calls.push({ pkgPath, expression });
      return evaluate(pkgPath, expression);
    },
  });

  return { registry: new GnoGrc20Registry(fake.factory), calls };
};

const keysIn = (expression: string): string[] => [...expression.matchAll(/Get\("([^"]+)"\)/g)].map(match => match[1]);

describe('GnoGrc20Registry.listKeys', () => {
  it('queries the chain registry with offset/limit and splits keys', async () => {
    const { registry, calls } = setup(() => `(27 int)\n("${FOO},${BAR}," string)`);

    await expect(registry.listKeys(network, 10, 2)).resolves.toEqual({ total: 27, keys: [FOO, BAR] });
    expect(calls[0].pkgPath).toBe('gno.land/r/nt/grc20reg/v0');
    expect(calls[0].expression).toContain('reg.IterateByOffset(10, 2, ');
    expect(calls[0].expression).toContain('return reg.Size(), s');
  });

  it('handles the end of the list and empty or malformed output', async () => {
    await expect(setup(() => '(27 int)\n("" string)').registry.listKeys(network, 30, 10)).resolves.toEqual({ total: 27, keys: [] });
    await expect(setup(() => '').registry.listKeys(network, 0, 10)).resolves.toEqual({ total: 0, keys: [] });
    await expect(setup(() => '(3 int)').registry.listKeys(network, 0, 10)).resolves.toEqual({ total: 3, keys: [] });
  });

  it('propagates evaluation failures', async () => {
    const { registry } = setup(() => {
      throw new Error('qeval failed');
    });

    await expect(registry.listKeys(network, 0, 1)).rejects.toThrow('qeval failed');
  });
});

describe('GnoGrc20Registry.getTokens', () => {
  it('reads metadata in request order and drops unregistered tokens', async () => {
    const { registry, calls } = setup(() => '("Foo" string)\n("FOO" string)\n(6 int)\n("" string)\n("" string)\n(0 int)');

    await expect(registry.getTokens(network, [FOO, BAR])).resolves.toEqual([{
      id: FOO,
      networkId: network.id,
      family: 'gno',
      type: 'grc20',
      name: 'Foo',
      symbol: 'FOO',
      decimals: 6,
      pkgPath: 'gno.land/r/demo/foo',
      isNative: false,
    }]);
    expect(keysIn(calls[0].expression)).toEqual([FOO, BAR]);
    expect(calls[0].expression).toContain('(func() (string, string, int, string, string, int)');
  });

  it('supports 0 and 18 decimals and decodes escaped names', async () => {
    const { registry } = setup(() => '("A \\"x\\"" string)\n("A" string)\n(0 int)\n("B" string)\n("B" string)\n(18 int)');
    const tokens = await registry.getTokens(network, [FOO, BAR]);

    expect(tokens.map(token => [token.name, token.decimals])).toEqual([['A "x"', 0], ['B', 18]]);
  });

  it('skips invalid keys without querying and returns [] for no keys', async () => {
    const { registry, calls } = setup(() => '');

    await expect(registry.getTokens(network, ['ugnot', 'not/a.'])).resolves.toEqual([]);
    await expect(registry.getTokens(network, [])).resolves.toEqual([]);
    expect(calls).toHaveLength(0);
  });

  it('drops tokens when the node returns fewer tuples than asked', async () => {
    const { registry } = setup(() => '("Foo" string)');

    await expect(registry.getTokens(network, [FOO])).resolves.toEqual([]);
    await expect(setup(() => '').registry.getTokens(network, [FOO])).resolves.toEqual([]);
  });

  it('batches 50 keys per query', async () => {
    const keys = Array.from({ length: 120 }, (_, index) => `gno.land/r/demo/t${index}.T${index}`);
    const { registry, calls } = setup((_, expression) => keysIn(expression).map(key => `("${key}" string)\n("S" string)\n(6 int)`).join('\n'));
    const tokens = await registry.getTokens(network, keys);

    expect(calls.map(call => keysIn(call.expression).length)).toEqual([50, 50, 20]);
    expect(tokens.map(token => token.id)).toEqual(keys);
  });
});

describe('GnoGrc20Registry.getBalances', () => {
  it('returns balances only for registered tokens', async () => {
    const { registry, calls } = setup(() => '(true bool)\n(9223372036854775807 int64)\n(false bool)\n(0 int64)');

    await expect(registry.getBalances(network, OWNER, [FOO, BAR])).resolves.toEqual({ [FOO]: '9223372036854775807' });
    expect(calls[0].expression).toContain(`t.BalanceOf("${OWNER}")`);
    expect(calls[0].expression).toContain('(func() (bool, int64, bool, int64)');
  });

  it('defaults a missing value tuple to 0', async () => {
    await expect(setup(() => '(true bool)').registry.getBalances(network, OWNER, [FOO])).resolves.toEqual({ [FOO]: '0' });
  });

  it('returns {} for no keys and batches large requests', async () => {
    const keys = Array.from({ length: 51 }, (_, index) => `gno.land/r/demo/t${index}.T`);
    const { registry, calls } = setup((_, expression) => keysIn(expression).map(() => '(true bool)\n(1 int64)').join('\n'));

    await expect(registry.getBalances(network, OWNER, [])).resolves.toEqual({});
    expect(Object.keys(await registry.getBalances(network, OWNER, keys))).toHaveLength(51);
    expect(calls).toHaveLength(2);
  });
});
