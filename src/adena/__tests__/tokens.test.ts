import { WalletErrorCode } from '../../agent';
import { fakeOnblocMcp } from '../../harness/mcp/testing/fakeOnblocMcp';
import { createOnblocTokenResolver, pickToken } from '../tokens';

const owner = 'g1axehvc90taqzngkg8amdfw7q6lfyjekfkc4n7v';
const gns = { packagePath: 'gno.land/r/gnoswap/gns', symbol: 'GNS', amount: '63607', decimals: 6 };
const wugnot = { packagePath: 'gno.land/r/gnoland/wugnot', symbol: 'WUGNOT', amount: '5', decimals: 6 };

describe('pickToken', () => {
  it('finds a token by its symbol in any case', () => {
    expect(pickToken(' gns ', [wugnot, gns])).toEqual({ symbol: 'GNS', decimals: 6, packagePath: gns.packagePath, balance: 63607n });
  });

  it('finds a token by its package path', () => {
    expect(pickToken(wugnot.packagePath, [gns, wugnot]).symbol).toBe('WUGNOT');
  });

  it('does not treat a GRC20 token calling itself GNOT as the native token', () => {
    const lookalike = { ...gns, packagePath: 'gno.land/r/scam/gnot', symbol: 'GNOT' };

    expect(() => pickToken('GNOT', [lookalike])).toThrow(expect.objectContaining({ code: WalletErrorCode.UnknownToken }));
    expect(pickToken(lookalike.packagePath, [lookalike]).packagePath).toBe(lookalike.packagePath);
  });

  it('refuses a token the wallet does not hold', () => {
    expect(() => pickToken('DOGE', [gns])).toThrow(expect.objectContaining({ code: WalletErrorCode.UnknownToken }));
  });

  it('refuses a symbol shared by several tokens and lists their package paths', () => {
    const twin = { ...gns, packagePath: 'gno.land/r/other/gns' };

    expect(() => pickToken('GNS', [gns, twin])).toThrow(
      expect.objectContaining({
        code: WalletErrorCode.AmbiguousToken,
        message: expect.stringContaining(`${gns.packagePath}, ${twin.packagePath}`),
      })
    );
  });

  it.each([undefined, '-1', '1.5', '1e6', '9'.repeat(79)])('refuses a holding with an unreadable balance: %p', (amount) => {
    expect(() => pickToken('GNS', [{ ...gns, amount }])).toThrow(
      expect.objectContaining({ code: WalletErrorCode.UnknownToken })
    );
  });

  it('keeps balances above the safe integer range exact', () => {
    expect(pickToken('GNS', [{ ...gns, amount: '9007199254740993' }]).balance).toBe(9007199254740993n);
  });

  it.each([[null], [[null, 'junk', { packagePath: 5, symbol: 'GNS', decimals: 6 }, { ...gns, decimals: -1 }]]])(
    'ignores holdings it cannot read (%p)',
    (items) => {
      expect(() => pickToken('GNS', items ?? [])).toThrow(expect.objectContaining({ code: WalletErrorCode.UnknownToken }));
    }
  );
});

describe('createOnblocTokenResolver', () => {
  const endpoint = 'https://example.test/mcp';
  const server = (output: Record<string, unknown>) => fakeOnblocMcp([{ name: 'get_token_balances', output }]);

  it("reads the owner's holdings from the Onbloc MCP", async () => {
    const { fetcher, calls } = server({ address: owner, items: [wugnot, gns] });

    const token = await createOnblocTokenResolver({ endpoint, fetcher })('GNS', owner);

    expect(token).toEqual({ symbol: 'GNS', decimals: 6, packagePath: gns.packagePath, balance: 63607n });
    expect(calls).toEqual([{ name: 'get_token_balances', arguments: { address: owner } }]);
  });
  it.each([false, true])('resolves duplicate symbols by exact path regardless of order (%s)', async (reverse) => {
    const twin = { ...gns, packagePath: 'gno.land/r/other/gns', amount: '300000000', decimals: 8 };
    const items = reverse ? [twin, gns] : [gns, twin];
    const { fetcher } = server({ address: owner, items });
    const resolve = createOnblocTokenResolver({ endpoint, fetcher });
    await expect(resolve('GNS', owner)).rejects.toMatchObject({
      code: WalletErrorCode.AmbiguousToken,
      candidateIds: items.map(item => item.packagePath),
      message: expect.stringContaining(gns.packagePath),
    });
    await expect(resolve('GNS', owner)).rejects.toMatchObject({ message: expect.stringContaining(twin.packagePath) });
    await expect(resolve(twin.packagePath, owner)).resolves.toEqual({
      symbol: 'GNS', decimals: 8, packagePath: twin.packagePath, balance: 300000000n,
    });
  });

  it.each([
    { address: 'other', items: [gns] },
    { address: owner, items: [{ ...gns, address: 'other' }] },
    { address: owner, items: [gns, { ...gns, packagePath: 'gno.land/r/other/gns', amount: 'bad' }] },
  ])('fails closed for untrustworthy holdings: %j', async (output) => {
    const { fetcher } = server(output);
    await expect(createOnblocTokenResolver({ endpoint, fetcher })('GNS', owner)).rejects.toMatchObject({
      code: WalletErrorCode.WalletFailed,
    });
  });

  it('rejects a native balance belonging to another account', async () => {
    const { fetcher } = fakeOnblocMcp([
      { name: 'get_native_balance', output: { address: 'other', denom: 'ugnot', balance: '100' } },
    ]);
    await expect(createOnblocTokenResolver({ endpoint, fetcher })('GNOT', owner)).rejects.toMatchObject({
      code: WalletErrorCode.WalletFailed,
    });
  });

  it('reads the native balance for GNOT instead of a GRC20 lookalike', async () => {
    const { fetcher, calls } = fakeOnblocMcp([
      { name: 'get_native_balance', output: { address: owner, denom: 'ugnot', balance: '9007199254740993' } },
      { name: 'get_token_balances', output: { address: owner, items: [{ ...gns, symbol: 'GNOT' }] } },
    ]);

    await expect(createOnblocTokenResolver({ endpoint, fetcher })(' gnot ', owner)).resolves.toEqual({
      symbol: 'GNOT', decimals: 6, balance: 9007199254740993n,
    });
    expect(calls).toEqual([{ name: 'get_native_balance', arguments: { address: owner } }]);
  });

  it.each([
    { denom: 'ugnot', balance: '0' },
    { denom: 'ugnot', balance: '1' },
  ])('accepts a small native balance: %j', async (output) => {
    const { fetcher } = fakeOnblocMcp([{ name: 'get_native_balance', output: { address: owner, ...output } }]);

    await expect(createOnblocTokenResolver({ endpoint, fetcher })('GNOT', owner)).resolves.toMatchObject({
      balance: BigInt(output.balance),
    });
  });

  it.each([
    { denom: 'other', balance: '10' },
    { denom: 'ugnot', balance: '-1' },
    { denom: 'ugnot', balance: '1.5' },
    { denom: 'ugnot', balance: '9'.repeat(79) },
    { denom: 'ugnot' },
  ])('fails closed on an invalid native balance: %j', async (output) => {
    const { fetcher } = fakeOnblocMcp([{ name: 'get_native_balance', output: { address: owner, ...output } }]);

    await expect(createOnblocTokenResolver({ endpoint, fetcher })('GNOT', owner)).rejects.toMatchObject({
      code: WalletErrorCode.WalletFailed,
    });
  });

  it('turns a failed lookup into a wallet error the model can read', async () => {
    const { fetcher } = fakeOnblocMcp([{ name: 'get_native_balance', output: { address: owner } }]);

    await expect(createOnblocTokenResolver({ endpoint, fetcher })('GNS', owner)).rejects.toMatchObject({
      code: WalletErrorCode.WalletFailed,
      message: expect.stringContaining('get_token_balances is not available'),
    });
  });

  it('does not wrap an abort', async () => {
    const { fetcher } = server({ address: owner, items: [gns] });
    const controller = new AbortController();
    controller.abort(new Error('stopped'));

    await expect(createOnblocTokenResolver({ endpoint, fetcher })('GNS', owner, controller.signal)).rejects.toThrow(
      'stopped'
    );
  });
});
