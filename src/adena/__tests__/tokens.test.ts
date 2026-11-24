import { WalletErrorCode } from '../../agent';
import { fakeOnblocMcp } from '../../harness/mcp/testing/fakeOnblocMcp';
import { createOnblocTokenResolver, NATIVE_TOKEN, pickToken } from '../tokens';

const owner = 'g1axehvc90taqzngkg8amdfw7q6lfyjekfkc4n7v';
const gns = { packagePath: 'gno.land/r/gnoswap/gns', symbol: 'GNS', amount: '63607', decimals: 6 };
const wugnot = { packagePath: 'gno.land/r/gnoland/wugnot', symbol: 'WUGNOT', amount: '5', decimals: 6 };

describe('pickToken', () => {
  it('finds a token by its symbol in any case', () => {
    expect(pickToken(' gns ', [wugnot, gns])).toEqual({ symbol: 'GNS', decimals: 6, packagePath: gns.packagePath });
  });

  it('finds a token by its package path', () => {
    expect(pickToken(wugnot.packagePath, [gns, wugnot]).symbol).toBe('WUGNOT');
  });

  it('answers GNOT with the native token without looking at the holdings', () => {
    expect(pickToken('gnot', [])).toBe(NATIVE_TOKEN);
  });

  it('lets the native token win its symbol over a GRC20 token calling itself GNOT', () => {
    const lookalike = { ...gns, packagePath: 'gno.land/r/scam/gnot', symbol: 'GNOT' };

    expect(pickToken('GNOT', [lookalike])).toBe(NATIVE_TOKEN);
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

    expect(token).toEqual({ symbol: 'GNS', decimals: 6, packagePath: gns.packagePath });
    expect(calls).toEqual([{ name: 'get_token_balances', arguments: { address: owner } }]);
  });

  it('does not call the MCP for the native token', async () => {
    const { fetcher, calls } = server({ address: owner, items: [] });

    await expect(createOnblocTokenResolver({ endpoint, fetcher })('GNOT', owner)).resolves.toBe(NATIVE_TOKEN);
    expect(calls).toEqual([]);
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
