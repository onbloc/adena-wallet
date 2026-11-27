import { fakeOnblocMcp } from '../../../harness/mcp/testing/fakeOnblocMcp';
import { TransactionType, WalletErrorCode } from '../../../agent';
import { balancesFromOnbloc, createOnblocMockWallet, fetchOnblocBalances } from '../onblocWallet';
import { FIXTURE } from '../fixture';
import { TokenSymbol } from '../tokens';

const account = 'g1axehvc90taqzngkg8amdfw7q6lfyjekfkc4n7v';
const native = { address: account, denom: 'ugnot', balance: '44290358689' };
const gnsItem = { packagePath: 'gno.land/r/gnoswap/gns', symbol: 'GNS', amount: '63607', decimals: 6 };
const tokens = (...items: unknown[]) => ({ address: account, items });

describe('balancesFromOnbloc', () => {
  it('converts base units to decimal balances', () => {
    expect(balancesFromOnbloc(native, tokens(gnsItem))).toEqual({ GNOT: '44290.358689', GNS: '0.063607' });
  });

  it('reads GNS by package path, not by symbol', () => {
    const lookalike = { ...gnsItem, packagePath: 'gno.land/r/scam/gns', amount: '999000000' };

    expect(balancesFromOnbloc(native, tokens(lookalike, gnsItem)).GNS).toBe('0.063607');
    expect(balancesFromOnbloc(native, tokens(lookalike)).GNS).toBe('0');
  });

  it.each([[[]], [null], [[null, 'junk', { packagePath: 5 }]]])('treats items %p as no GNS', (items) => {
    expect(balancesFromOnbloc(native, { address: account, items }).GNS).toBe('0');
  });

  it.each([
    ['another denom', { ...native, denom: 'uatom' }, tokens()],
    ['a negative balance', { ...native, balance: '-1' }, tokens()],
    ['a missing balance', { denom: 'ugnot' }, tokens()],
    ['a missing item list', native, { address: account }],
  ])('rejects %s', (_label, nativeOutput, tokenOutput) => {
    expect(() => balancesFromOnbloc(nativeOutput, tokenOutput)).toThrow('Unexpected Onbloc balance response');
  });

  it('rejects a balance the mock wallet cannot hold', () => {
    const huge = { ...native, balance: '9'.repeat(60) };

    expect(() => balancesFromOnbloc(huge, tokens())).toThrow('too large');
  });
});

describe('Onbloc-funded mock wallet', () => {
  const server = () =>
    fakeOnblocMcp([
      { name: 'get_native_balance', output: native },
      { name: 'get_token_balances', output: tokens(gnsItem) },
    ]);

  it('reads both balances for the configured address', async () => {
    const { fetcher, calls } = server();

    const balances = await fetchOnblocBalances({ endpoint: 'https://example.test/mcp', account, fetcher });

    expect(balances).toEqual({ GNOT: '44290.358689', GNS: '0.063607' });
    expect(calls).toEqual([
      { name: 'get_native_balance', arguments: { address: account } },
      { name: 'get_token_balances', arguments: { address: account } },
    ]);
  });

  it('binds testnet drafts to their snapshot chain without changing balances or precision', async () => {
    const chainId = 'onyx-1';
    const { fetcher } = fakeOnblocMcp([
      { name: 'get_native_balance', output: { ...native, network: chainId } },
      { name: 'get_token_balances', output: { ...tokens(gnsItem), network: chainId } },
    ]);
    const sdk = await createOnblocMockWallet({
      onbloc: { endpoint: 'https://test.example/mcp', account, chainId, fetcher },
    });
    const before = sdk.inspect();
    const transfer = await sdk.transfer({ from: account, to: FIXTURE.recipient, amount: '0.000001', token: TokenSymbol.Gnot });
    const approval = await sdk.approve({ from: account, spender: FIXTURE.recipient, amount: '0.000001', token: gnsItem.packagePath });
    for (const draft of [transfer, approval]) {
      expect(draft.summary).toMatchObject({ chainId, amount: '0.000001' });
      expect(draft.tx).toMatchObject({ chainId, signatures: [] });
    }
    expect(transfer.tx).toMatchObject({ messages: [{ value: { amount: '1ugnot' } }] });
    expect(approval.tx).toMatchObject({ messages: [{ value: { args: [FIXTURE.recipient, '1'] } }] });
    await expect(sdk.transfer({ from: account, to: FIXTURE.recipient, amount: '0.0000001', token: TokenSymbol.Gnot }))
      .rejects.toMatchObject({ code: WalletErrorCode.InvalidAmount });
    expect(sdk.inspect()).toEqual(before);
  });

  it('rejects a foreign network before funding a snapshot wallet', async () => {
    const { fetcher } = fakeOnblocMcp([
      { name: 'get_native_balance', output: { ...native, network: 'foreign-chain' } },
      { name: 'get_token_balances', output: tokens(gnsItem) },
    ]);
    await expect(createOnblocMockWallet({
      onbloc: { endpoint: 'https://test.example/mcp', account, chainId: 'onyx-1', fetcher },
    })).rejects.toThrow('get_native_balance failed');
  });

  it('fails when a balance tool is missing', async () => {
    const { fetcher } = fakeOnblocMcp([{ name: 'get_native_balance', output: native }]);

    await expect(
      fetchOnblocBalances({ endpoint: 'https://example.test/mcp', account, fetcher })
    ).rejects.toThrow('get_token_balances is not available');
  });

  it('prepares a transfer from the address and leaves the mock balances unchanged', async () => {
    const { fetcher, calls } = server();
    const sdk = await createOnblocMockWallet({
      onbloc: { endpoint: 'https://example.test/mcp', account, fetcher },
    });
    const to = FIXTURE.recipient;

    const { summary } = await sdk.transfer({ from: account, to, amount: '0.5', token: TokenSymbol.Gnot });

    expect(summary).toEqual({
      type: TransactionType.Transfer,
      chainId: 'gnoland-1',
      from: account,
      to,
      amount: '0.5',
      token: TokenSymbol.Gnot,
    });
    expect(await sdk.getBalance(account)).toEqual({ GNOT: '44290.358689', GNS: '0.063607' });
    expect(await sdk.getBalance(to)).toEqual({ GNOT: '0', GNS: '0' });
    // The chain is only read, never written, and not read again after the transfer.
    expect(calls).toHaveLength(2);
  });
});

describe('Onbloc token identity', () => {
  const lookalike = { ...gnsItem, packagePath: 'gno.land/r/other/gns', amount: '1234', decimals: 2 };

  it.each([
    [gnsItem, lookalike],
    [lookalike, gnsItem],
  ])('requires a path for duplicate symbols regardless of order', async (first, second) => {
    const { fetcher, calls } = fakeOnblocMcp([
      { name: 'get_native_balance', output: native },
      { name: 'get_token_balances', output: tokens(first, second) },
    ]);
    const sdk = await createOnblocMockWallet({ onbloc: { endpoint: 'https://example.test/mcp', account, fetcher } });
    const transfer = { from: account, to: FIXTURE.recipient, token: 'GNS', amount: '0.01' };
    const approval = { from: account, spender: FIXTURE.recipient, token: 'GNS', amount: '0.01' };
    const candidates = expect.arrayContaining([gnsItem.packagePath, lookalike.packagePath]);
    await expect(sdk.transfer(transfer)).rejects.toMatchObject({ code: WalletErrorCode.AmbiguousToken, candidateIds: candidates });
    await expect(sdk.approve(approval)).rejects.toMatchObject({ code: WalletErrorCode.AmbiguousToken, candidateIds: candidates });
    expect((await sdk.transfer({ ...transfer, token: lookalike.packagePath })).summary).toMatchObject({
      token: 'GNS', packagePath: lookalike.packagePath, amount: '0.01',
    });
    expect((await sdk.approve({ ...approval, token: gnsItem.packagePath })).summary).toMatchObject({
      token: 'GNS', packagePath: gnsItem.packagePath, amount: '0.01',
    });
    await expect(sdk.transfer({ ...transfer, token: lookalike.packagePath, amount: '12.35' }))
      .rejects.toMatchObject({ code: WalletErrorCode.InsufficientBalance });
    await expect(sdk.approve({ ...approval, token: lookalike.packagePath, amount: '0.001' }))
      .rejects.toMatchObject({ code: WalletErrorCode.InvalidAmount });
    await expect(sdk.transfer({ ...transfer, from: FIXTURE.recipient, token: lookalike.packagePath }))
      .rejects.toMatchObject({ code: WalletErrorCode.UnknownToken });
    expect(await sdk.getBalance(account)).toEqual({ GNOT: '44290.358689', GNS: '0.063607' });
    expect(calls).toHaveLength(2);
  });

  it('rejects an incomplete identifiable token rather than dropping an ambiguity', async () => {
    const { fetcher } = fakeOnblocMcp([
      { name: 'get_native_balance', output: native },
      { name: 'get_token_balances', output: tokens(gnsItem, { ...lookalike, amount: undefined }) },
    ]);
    await expect(createOnblocMockWallet({ onbloc: { endpoint: 'https://example.test/mcp', account, fetcher } }))
      .rejects.toMatchObject({ code: WalletErrorCode.WalletFailed });
  });
});
