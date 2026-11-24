import { fakeOnblocMcp } from '../../testing/fakeOnblocMcp';
import { ApprovalPolicy, TokenSymbol } from '../constants';
import { balancesFromOnbloc, createOnblocMockWallet, fetchOnblocBalances } from '../onblocWallet';
import { autoApproval } from '../sdk/approval';
import { FIXTURE } from '../sdk/fixture';

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

  it('fails when a balance tool is missing', async () => {
    const { fetcher } = fakeOnblocMcp([{ name: 'get_native_balance', output: native }]);

    await expect(
      fetchOnblocBalances({ endpoint: 'https://example.test/mcp', account, fetcher })
    ).rejects.toThrow('get_token_balances is not available');
  });

  it('owns the address and moves only mock balances on a transfer', async () => {
    const { fetcher, calls } = server();
    const sdk = await createOnblocMockWallet({
      onbloc: { endpoint: 'https://example.test/mcp', account, fetcher },
      requestApproval: autoApproval(ApprovalPolicy.Approve),
    });
    const to = FIXTURE.recipient;

    const message = await sdk.transfer({ from: account, to, amount: '0.5', token: TokenSymbol.Gnot });
    await sdk.sign(message);

    expect(await sdk.getBalance(account)).toEqual({ GNOT: '44289.858689', GNS: '0.063607' });
    expect(await sdk.getBalance(to)).toEqual({ GNOT: '0.5', GNS: '0' });
    // The chain is only read, never written, and not read again after the transfer.
    expect(calls).toHaveLength(2);
  });
});
