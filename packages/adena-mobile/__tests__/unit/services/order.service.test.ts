import { fromBase64 } from '@cosmjs/encoding';
import { MsgCall, MsgRun } from '@gnolang/gno-js-client';
import { Tx } from '@gnolang/tm2-js-client';

import { AppErrorCode, isAppError } from '../../../src/core/errors';
import { OrderKind } from '../../../src/domain/order';
import { SwapToken } from '../../../src/domain/swap';
import { derivePackageAddress } from '../../../src/utils/address';
import { GNS, installGnoswapFakes, WUGNOT } from '../../helpers/gnoswap-fakes';
import { setupWallet } from '../../helpers/render-screen';
import { createTestContainer } from '../../helpers/test-container';

const DCA = 'gno.land/r/gnoswap/order/dca';
const LIMIT = 'gno.land/r/gnoswap/order/limit';
const WHITELIST = 'gno.land/r/gnoswap/order/whitelist';
const DAY = 86_400;
const FEE = { gasWanted: '2000000', gasFee: '2000ugnot' };

interface OrderChain {
  tradable: boolean;
  // Address() each realm reports; defaults to its derived package address.
  addresses: Record<string, string>;
  dcaOrders: string;
  limitOrders: string;
}

const expectCode = async (promise: Promise<unknown>, code: AppErrorCode): Promise<void> => {
  const error = await promise.then(() => null, (caught: unknown) => caught);

  expect(isAppError(error, code)).toBe(true);
};

const decodeCalls = (encoded: string): { type: string; pkg?: string; func?: string; args?: string[]; send?: string; body?: string }[] =>
  Tx.decode(fromBase64(encoded)).messages.map((message) => {
    if (message.type_url === '/vm.m_call') {
      const call = MsgCall.decode(message.value);

      return { type: message.type_url, pkg: call.pkg_path, func: call.func, args: call.args, send: call.send };
    }

    return { type: message.type_url, body: MsgRun.decode(message.value).package?.files[0]?.body };
  });

describe('OrderService', () => {
  const now = Date.parse('2026-11-26T10:20:00Z');

  const setup = async (overrides: Partial<OrderChain> = {}) => {
    const env = createTestContainer({ now: () => now });
    const swap = installGnoswapFakes(env);
    const wallet = await setupWallet(env);
    const chain: OrderChain = { tradable: true, addresses: {}, dcaOrders: '', limitOrders: '', ...overrides };
    const swapEvaluate = env.gno.state.evaluate;

    env.gno.state.balances[wallet.address] = '1000000000ugnot';
    env.gno.state.evaluate = (pkgPath: string, expression: string): string => {
      if (expression === 'Address()') {
        return `("${chain.addresses[pkgPath] ?? derivePackageAddress(pkgPath)}" .uverse.address)`;
      }

      if (pkgPath === WHITELIST) {
        return `(${chain.tradable} bool)`;
      }

      if (pkgPath === DCA && expression.includes('GetAllowedIntervals()')) {
        return '("3600:3600,86400:3600,604800:86400," string)\n(1000000 int64)\n(365 int64)\n(15 int64)\n("340282366920938463463374607431768211456" string)';
      }

      if (pkgPath === LIMIT && expression.includes('GetOrderDeadlines()')) {
        return '(100 int64)\n(1000 int64)\n(300 int64)\n(2678400 int64)\n(15 int64)';
      }

      if (pkgPath === DCA && expression.includes('GetOrderIDsByOwner(')) {
        return `(${JSON.stringify(chain.dcaOrders)} string)`;
      }

      if (pkgPath === LIMIT && expression.includes('GetOrdersByOwner()')) {
        return `(${JSON.stringify(chain.limitOrders)} string)`;
      }

      return swapEvaluate(pkgPath, expression);
    };

    const service = env.container.orderService;
    const tokens = await service.getTokens(wallet.network);
    const token = (id: string): SwapToken => tokens.find(item => item.id === id)!;

    return { ...wallet, env, swap, chain, service, gnot: token('ugnot'), gns: token(GNS) };
  };

  it('is offered on built-in networks with the order protocol', async () => {
    const { service, network } = await setup();

    expect(service.isSupported(network)).toBe(true);
    expect(service.isSupported({ ...network, isCustom: true })).toBe(false);
  });

  it('starts a GNOT recurring buy: wrap, approve the DCA realm, then CreateOrder on the next slot', async () => {
    const { service, account, network, env, gnot, gns } = await setup();
    const prepared = await service.prepareDca(account, network, { input: gnot, output: gns, interval: DAY, amountPerExecution: '50000000', executionCount: 10 });

    // 10:20 UTC with hourly slots on a daily interval: the first round is at 11:00 UTC.
    expect(prepared.dca).toMatchObject({ slotOffset: 11 * 3600, firstRoundAt: Date.parse('2026-11-26T11:00:00Z') / 1000 });
    expect(prepared.escrow).toEqual({ token: gnot, amount: '500000000' });

    await service.submit(prepared, FEE);

    expect(decodeCalls(env.gno.state.broadcasts[0])).toEqual([
      { type: '/vm.m_call', pkg: 'gno.land/r/gnoland/wugnot', func: 'Deposit', args: [], send: '500000000ugnot' },
      { type: '/vm.m_call', pkg: 'gno.land/r/gnoland/wugnot', func: 'Approve', args: [derivePackageAddress(DCA), '500000000'], send: '' },
      { type: '/vm.m_call', pkg: DCA, func: 'CreateOrder', args: [WUGNOT, GNS, String(DAY), String(11 * 3600), '50000000', '10'], send: '' },
    ]);
  });

  it('places a GNS limit order with the realm as spender and the sell side as base token', async () => {
    const { service, account, network, env, gnot, gns } = await setup();
    const prepared = await service.prepareLimit(account, network, { input: gns, output: gnot, makingAmount: '100000000', takingAmount: '25000000', slippageBps: 50, duration: 7 * DAY });
    const expiresAt = Math.floor(now / 1000) + 7 * DAY;

    expect(prepared.limit?.expiresAt).toBe(expiresAt);
    env.gno.state.balances[env.container.accountService.getAddress(account, network)] = '1000000000ugnot';
    await expect(service.submit(prepared, FEE)).rejects.toThrow('Insufficient GNS balance');

    const messages = prepared.draft.messages as { type: string; value: { pkg_path?: string; func?: string; args?: string[]; package?: { files: { body: string }[] } } }[];

    expect(messages).toHaveLength(2);
    // Without a curated approve route the allowance goes through grc20reg, still to the limit realm.
    expect(messages[0].type).toBe('/vm.m_run');
    expect(messages[0].value.package?.files[0].body).toContain(`address("${derivePackageAddress(LIMIT)}"), 100000000`);
    expect(messages[1].value).toMatchObject({ pkg_path: LIMIT, func: 'CreateOrder', args: [GNS, WUGNOT, '100000000', '25000000', '50', String(expiresAt), GNS] });
  });

  it('refuses a realm that reports another address, an untradable pair and bad amounts', async () => {
    const forged = await setup({ addresses: { [DCA]: 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5' } });

    await expectCode(forged.service.prepareDca(forged.account, forged.network, { input: forged.gnot, output: forged.gns, interval: DAY, amountPerExecution: '50000000', executionCount: 10 }), AppErrorCode.INVALID_REQUEST);

    const closed = await setup({ tradable: false });

    await expect(closed.service.prepareDca(closed.account, closed.network, { input: closed.gnot, output: closed.gns, interval: DAY, amountPerExecution: '50000000', executionCount: 10 }))
      .rejects.toThrow('GnoSwap does not run recurring buys for this pair yet');

    const open = await setup();

    await expectCode(open.service.prepareDca(open.account, open.network, { input: open.gnot, output: open.gns, interval: 60, amountPerExecution: '50000000', executionCount: 10 }), AppErrorCode.INVALID_REQUEST);
    await expectCode(open.service.prepareLimit(open.account, open.network, { input: open.gns, output: open.gnot, makingAmount: '100000000', takingAmount: '0', slippageBps: 0, duration: DAY }), AppErrorCode.INVALID_REQUEST);
  });

  it('lists the owner\'s orders and claims or cancels them', async () => {
    const { service, account, network, env } = await setup({
      dcaOrders: `7|${WUGNOT}:${GNS}:86400:3600|86400|50000000|2|12|5|1790086400|36600000|1790000000;`,
      limitOrders: `3|${GNS}|${WUGNOT}|100000000|25000000|50|40000000|10100000|15150|1790000000|1790604800;`,
    });
    const orders = await service.listOrders(account, network);

    expect(orders.map(order => [order.kind, order.id])).toEqual([[OrderKind.DCA, '7'], [OrderKind.LIMIT, '3']]);
    expect(orders[0]).toMatchObject({ inputToken: WUGNOT, outputToken: GNS, executionCount: 10, executedCount: 3, claimable: '36600000' });

    await service.submit(await service.prepareClaim(account, network, orders[0]), FEE);
    await service.submit(await service.prepareCancel(account, network, orders[1]), FEE);

    expect(decodeCalls(env.gno.state.broadcasts[0])).toEqual([{ type: '/vm.m_call', pkg: DCA, func: 'Claim', args: ['7'], send: '' }]);
    expect(decodeCalls(env.gno.state.broadcasts[1])).toEqual([{ type: '/vm.m_call', pkg: LIMIT, func: 'CancelOrder', args: ['3'], send: '' }]);
    await expectCode(service.prepareClaim(account, network, orders[1]), AppErrorCode.INVALID_REQUEST);
  });
});
