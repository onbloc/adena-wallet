import { GnoMessageType } from '../../../../../src/repositories/chain/gno/gno-messages';
import { buildSwapMessages, SwapMessagesInput } from '../../../../../src/repositories/chain/gno/gno-swap-messages';
import { DEX_API_CONFIG, getGrc20RegistryConfig } from '../../../../../src/resources';

const CALLER = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';
const ROUTER_ADDRESS = 'g1vc883gshu5z7ytk5cdynhc8c2dh67pdp4cszkp';
const WUGNOT = 'gno.land/r/gnoland/wugnot.wugnot';
const GNS = 'gno.land/r/gnoswap/gns.GNS';
const ROUTE = `${WUGNOT}:${GNS}:3000`;

const base = (overrides: Partial<SwapMessagesInput> = {}): SwapMessagesInput => ({
  caller: CALLER,
  config: DEX_API_CONFIG['gnoland-1'].swap!,
  registry: getGrc20RegistryConfig('gnoland-1'),
  input: { native: true, swapPath: WUGNOT },
  output: { native: false, swapPath: GNS },
  amountIn: '1000000',
  minAmountOut: '4061077',
  routeArr: ROUTE,
  quoteArr: '100',
  deadline: 1_795_500_000,
  ...overrides,
});

const call = (pkg_path: string, func: string, args: string[] | null, send = '') =>
  ({ type: GnoMessageType.VM_CALL, value: { caller: CALLER, send, max_deposit: '', pkg_path, func, args } });

// Signatures on gnoland-1: wugnot.Deposit(cur), wugnot.Approve(cur, spender, amount), wugnot.Withdraw(cur, amount),
// router.ExactInSwapRoute(cur, inputToken, outputToken, amountIn, routeArr, quoteArr, amountOutMin, deadline int64, referrer).
describe('buildSwapMessages', () => {
  it('wraps GNOT, approves the router for the exact amount, then swaps', () => {
    expect(buildSwapMessages(base())).toEqual([
      call('gno.land/r/gnoland/wugnot', 'Deposit', null, '1000000ugnot'),
      call('gno.land/r/gnoland/wugnot', 'Approve', [ROUTER_ADDRESS, '1000000']),
      call('gno.land/r/gnoswap/router', 'ExactInSwapRoute', [WUGNOT, GNS, '1000000', ROUTE, '100', '4061077', '1795500000', '']),
    ]);
  });

  it('approves a GRC20 through grc20reg in a MsgRun and unwraps the guaranteed minimum to GNOT', () => {
    const messages = buildSwapMessages(base({
      input: { native: false, swapPath: GNS },
      output: { native: true, swapPath: WUGNOT },
      routeArr: `${GNS}:${WUGNOT}:3000`,
      minAmountOut: '240000',
    }));

    expect(messages.map(message => message.type)).toEqual([GnoMessageType.VM_RUN, GnoMessageType.VM_CALL, GnoMessageType.VM_CALL]);
    const run = messages[0];

    if (run.type !== GnoMessageType.VM_RUN) {
      throw new Error('expected a run message');
    }

    expect(run.value.package.files[0].body).toContain(`grc20reg0.Approve(0, cur, "${GNS}", address("${ROUTER_ADDRESS}"), 1000000)`);
    expect(run.value.send).toBe('');
    expect(messages[1]).toEqual(call('gno.land/r/gnoswap/router', 'ExactInSwapRoute', [GNS, WUGNOT, '1000000', `${GNS}:${WUGNOT}:3000`, '100', '240000', '1795500000', '']));
    expect(messages[2]).toEqual(call('gno.land/r/gnoland/wugnot', 'Withdraw', ['240000']));
  });

  it('prefers a curated approve route of the token realm', () => {
    const [approve] = buildSwapMessages(base({
      input: { native: false, swapPath: GNS, approveRoute: { name: 'Approve', args: ['$spender', '$amount'] } },
      output: { native: false, swapPath: WUGNOT },
    }));

    expect(approve).toEqual(call('gno.land/r/gnoswap/gns', 'Approve', [ROUTER_ADDRESS, '1000000']));
  });

  it('refuses anything it should not sign', () => {
    expect(() => buildSwapMessages(base({ amountIn: '0' }))).toThrow('amount');
    expect(() => buildSwapMessages(base({ amountIn: '1e6' }))).toThrow('amount');
    expect(() => buildSwapMessages(base({ minAmountOut: '9223372036854775808' }))).toThrow('amount');
    expect(() => buildSwapMessages(base({ amountIn: '999' }))).toThrow('wrap minimum');
    expect(() => buildSwapMessages(base({ caller: 'g1invalid' }))).toThrow('address');
    expect(() => buildSwapMessages(base({ output: { native: false, swapPath: 'ugnot' } }))).toThrow('token');
    expect(() => buildSwapMessages(base({ output: { native: false, swapPath: WUGNOT } }))).toThrow('token');
    expect(() => buildSwapMessages(base({ quoteArr: '50;50' }))).toThrow('route');
    expect(() => buildSwapMessages(base({ deadline: 1.5 }))).toThrow('route');
  });
});
