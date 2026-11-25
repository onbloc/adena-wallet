import { fromBase64 } from '@cosmjs/encoding';
import { MsgCall } from '@gnolang/gno-js-client';
import { TM2Error, Tx } from '@gnolang/tm2-js-client';

import { AppErrorCode, isAppError } from '../../../src/core/errors';
import { FeeEstimate, GNO_FEE_POLICY } from '../../../src/domain/fee';
import { ChainFamily } from '../../../src/domain/network';
import { DEFAULT_SWAP_SETTINGS, SwapToken } from '../../../src/domain/swap';
import { TokenType } from '../../../src/domain/token';
import { TransactionDraft } from '../../../src/domain/transaction';
import { GnoTokenResourceRepository } from '../../../src/repositories/chain/gno/gno-token-resource.repository';
import { BUILT_IN_NETWORKS } from '../../../src/resources';
import { SWAP_QUOTE_TTL_MS, SWAP_REVIEW_TTL_MS } from '../../../src/services/swap.service';
import { GNS, installGnoswapFakes, qeval, ROUTER, ROUTER_ADDRESS, WUGNOT } from '../../helpers/gnoswap-fakes';
import { setupWallet } from '../../helpers/render-screen';
import { createTestContainer } from '../../helpers/test-container';

const expectCode = async (promise: Promise<unknown>, code: AppErrorCode): Promise<void> => {
  const error = await promise.then(() => null, (caught: unknown) => caught);

  expect(isAppError(error, code)).toBe(true);
};

describe('SwapService', () => {
  let now = Date.parse('2026-11-24T10:00:00Z');

  const setup = async (options: Parameters<typeof installGnoswapFakes>[1] = {}) => {
    const env = createTestContainer({ now: () => now });
    const fakes = installGnoswapFakes(env, options);
    const wallet = await setupWallet(env);
    const service = env.container.swapService;
    const tokens = await service.getTokens(wallet.network);
    const token = (id: string): SwapToken => tokens.find(item => item.id === id)!;

    env.gno.state.balances[wallet.address] = '100000000ugnot';
    return { ...wallet, ...fakes, env, service, tokens, gnot: token('ugnot'), gns: token(GNS) };
  };

  beforeEach(() => {
    now = Date.parse('2026-11-24T10:00:00Z');
  });

  it('is offered only on built-in Gno networks with GnoSwap metadata', async () => {
    const { service, network } = await setup();
    const atomone = BUILT_IN_NETWORKS.find(item => item.id === 'atomone-1')!;

    expect(service.isSupported(network)).toBe(true);
    expect(service.isSupported(BUILT_IN_NETWORKS.find(item => item.id === 'onyx-1')!)).toBe(true);
    expect(service.isSupported(BUILT_IN_NETWORKS.find(item => item.id === 'gnoswap')!)).toBe(true);
    expect(service.isSupported(atomone)).toBe(false);
    expect(service.isSupported({ ...network, isCustom: true })).toBe(false);
    await expectCode(service.getTokens(atomone), AppErrorCode.UNSUPPORTED_NETWORK);
  });

  it('quotes from the route API and takes the amount from the router dry run', async () => {
    const { service, network, gnot, gns, routeBodies, dryExpressions } = await setup();
    const quote = await service.getQuote({ network, input: gnot, output: gns, exactType: 'EXACT_IN', amount: '1000000' });

    expect(routeBodies).toEqual([{ inputTokenPath: WUGNOT, outputTokenPath: GNS, exactType: 'EXACT_IN', amount: '1000000' }]);
    expect(dryExpressions).toEqual([
      `DrySwapRoute("${WUGNOT}", "${GNS}", "1000000", "EXACT_IN", "${WUGNOT}:gno.land/r/nym-thegnomic001/gnomic.GNOMIC:3000*POOL*gno.land/r/nym-thegnomic001/gnomic.GNOMIC:${GNS}:10000,${WUGNOT}:${GNS}:3000", "50,50", "0")`,
    ]);
    expect(quote).toMatchObject({ amountIn: '1000000', amountOut: '4151365', quoteArr: '50,50', routerFeeBps: 15, source: 'router-api', inputPath: WUGNOT, outputPath: GNS });
    expect(quote.priceImpactPercent).toEqual(expect.any(Number));
  });

  it('uses the router amount even when the API claims more', async () => {
    const { service, network, gnot, gns } = await setup({ drySwap: '("1000000" string)\n("100" string)\n(undefined)' });

    expect((await service.getQuote({ network, input: gnot, output: gns, exactType: 'EXACT_IN', amount: '1000000' })).amountOut).toBe('100');
  });

  it('falls back to pool-derived routes when the route API is down and keeps the best dry run', async () => {
    const outputs = ['4000000', '4100000', '3000000'];
    const { service, network, gnot, gns, dryExpressions } = await setup({
      route: null,
      drySwap: () => `("1000000" string)\n("${outputs.shift() ?? '1'}" string)\n(undefined)`,
    });
    const quote = await service.getQuote({ network, input: gnot, output: gns, exactType: 'EXACT_IN', amount: '1000000' });

    expect(quote.source).toBe('pools');
    expect(dryExpressions.length).toBeGreaterThan(1);
    expect(quote.amountOut).toBe('4100000');
    expect(quote.quoteArr).toBe('100');
  });

  it('reports no route for an empty answer, failing dry runs or a partial fill', async () => {
    const empty = await setup({ route: { estimatedRoutes: [] } });

    await expectCode(empty.service.getQuote({ network: empty.network, input: empty.gnot, output: empty.gns, exactType: 'EXACT_IN', amount: '1000000' }), AppErrorCode.SWAP_NO_ROUTE);

    const failing = await setup({ drySwap: qeval.drySwapMissingPool });

    await expectCode(failing.service.getQuote({ network: failing.network, input: failing.gnot, output: failing.gns, exactType: 'EXACT_IN', amount: '1000000' }), AppErrorCode.SWAP_NO_ROUTE);

    const partial = await setup({ drySwap: '("999" string)\n("5" string)\n(undefined)' });

    await expectCode(partial.service.getQuote({ network: partial.network, input: partial.gnot, output: partial.gns, exactType: 'EXACT_IN', amount: '1000000' }), AppErrorCode.SWAP_NO_ROUTE);
  });

  it('reports a failed quote, not missing liquidity, when neither the route API nor the pools answer', async () => {
    const { service, network, gnot, gns } = await setup({ route: null, pools: null });

    await expectCode(service.getQuote({ network, input: gnot, output: gns, exactType: 'EXACT_IN', amount: '1000000' }), AppErrorCode.SWAP_QUOTE_FAILED);
  });

  it('still reports no route when the API is down but the pools answer without one', async () => {
    const { service, network, gnot, gns } = await setup({ route: null, pools: [] });

    await expectCode(service.getQuote({ network, input: gnot, output: gns, exactType: 'EXACT_IN', amount: '1000000' }), AppErrorCode.SWAP_NO_ROUTE);
  });

  it('treats only a VM error from the dry run as a refused route, not a transport failure', async () => {
    const transport = await setup({
      drySwap: () => {
        throw new Error('socket hang up');
      },
    });

    await expectCode(transport.service.getQuote({ network: transport.network, input: transport.gnot, output: transport.gns, exactType: 'EXACT_IN', amount: '1000000' }), AppErrorCode.SWAP_QUOTE_FAILED);

    const vm = await setup({
      drySwap: () => {
        throw new TM2Error('unknown error: /vm.VMError', 'panic: pool does not exist');
      },
    });

    await expectCode(vm.service.getQuote({ network: vm.network, input: vm.gnot, output: vm.gns, exactType: 'EXACT_IN', amount: '1000000' }), AppErrorCode.SWAP_NO_ROUTE);
  });

  it('offers a retry when one pool candidate is refused and the others time out', async () => {
    let calls = 0;
    const { service, network, gnot, gns, dryExpressions } = await setup({
      route: null,
      drySwap: () => {
        calls += 1;

        if (calls === 1) {
          throw new TM2Error('unknown error: /vm.VMError', 'panic: pool does not exist');
        }

        throw new Error('timeout');
      },
    });

    await expectCode(service.getQuote({ network, input: gnot, output: gns, exactType: 'EXACT_IN', amount: '1000000' }), AppErrorCode.SWAP_QUOTE_FAILED);
    expect(dryExpressions.length).toBeGreaterThan(1);
  });

  it('rejects the same token on both sides and invalid amounts', async () => {
    const { service, network, gnot, tokens } = await setup();
    const wugnot = tokens.find(token => token.id === WUGNOT)!;

    await expectCode(service.getQuote({ network, input: gnot, output: wugnot, exactType: 'EXACT_IN', amount: '1000' }), AppErrorCode.SWAP_INVALID_TOKEN);
    await expectCode(service.getQuote({ network, input: gnot, output: tokens[2], exactType: 'EXACT_IN', amount: '0' }), AppErrorCode.INVALID_AMOUNT);
  });

  it('prepares wrap, approve and swap with a locally computed minimum and deadline, then broadcasts after a fresh dry run', async () => {
    const { service, network, account, gnot, gns, env, address } = await setup();
    const quote = await service.getQuote({ network, input: gnot, output: gns, exactType: 'EXACT_IN', amount: '1000000' });
    const prepared = await service.prepare({ account, network, input: gnot, output: gns, quote, settings: { slippage: 1, deadlineMinutes: 20 } });

    expect(prepared.minAmountOut).toBe('4109851');
    expect(prepared.slippageBps).toBe(100);
    expect(prepared.estimate.gasUsed).toEqual(expect.any(String));

    now += 30_000;
    await service.submit(prepared, { gasWanted: '5000000', gasFee: '5000ugnot' });
    const tx = Tx.decode(fromBase64(env.gno.state.broadcasts[0]));
    const calls = tx.messages.map(message => MsgCall.decode(message.value));

    expect(tx.messages.map(message => message.type_url)).toEqual(['/vm.m_call', '/vm.m_call', '/vm.m_call']);
    expect(calls.map(call => [call.pkg_path, call.func, call.send])).toEqual([
      ['gno.land/r/gnoland/wugnot', 'Deposit', '1000000ugnot'],
      ['gno.land/r/gnoland/wugnot', 'Approve', ''],
      [ROUTER, 'ExactInSwapRoute', ''],
    ]);
    expect(calls[1].args).toEqual([ROUTER_ADDRESS, '1000000']);
    // The deadline is refreshed at confirm time: now (+30s) + 20 minutes.
    expect(calls[2].args).toEqual([WUGNOT, GNS, '1000000', quote.routeArr, '50,50', '4109851', String(now / 1000 + 1200), '']);
    expect(calls.every(call => call.caller === address)).toBe(true);
  });

  it('refuses to sign when the fresh dry run falls below the minimum', async () => {
    const outputs = ['4151365', '4000000'];
    const { service, network, account, gnot, gns, env } = await setup({ drySwap: () => `("1000000" string)\n("${outputs.shift() ?? '4000000'}" string)\n(undefined)` });
    const quote = await service.getQuote({ network, input: gnot, output: gns, exactType: 'EXACT_IN', amount: '1000000' });
    const prepared = await service.prepare({ account, network, input: gnot, output: gns, quote, settings: DEFAULT_SWAP_SETTINGS });

    await expectCode(service.submit(prepared, { gasWanted: '5000000', gasFee: '5000ugnot' }), AppErrorCode.SWAP_PRICE_MOVED);
    expect(env.gno.state.broadcasts).toHaveLength(0);
  });

  it('confirms a review opened on an aging quote once the quote TTL has passed', async () => {
    const { service, network, account, gnot, gns, env } = await setup();
    const quote = await service.getQuote({ network, input: gnot, output: gns, exactType: 'EXACT_IN', amount: '1000000' });

    now += SWAP_QUOTE_TTL_MS - 10_000;
    const prepared = await service.prepare({ account, network, input: gnot, output: gns, quote, settings: DEFAULT_SWAP_SETTINGS });

    now += 30_000;
    await service.submit(prepared, { gasWanted: '5000000', gasFee: '5000ugnot' });
    expect(env.gno.state.broadcasts).toHaveLength(1);
  });

  it('refuses to sign a review left open past its TTL', async () => {
    const { service, network, account, gnot, gns, env, dryExpressions } = await setup();
    const quote = await service.getQuote({ network, input: gnot, output: gns, exactType: 'EXACT_IN', amount: '1000000' });
    const prepared = await service.prepare({ account, network, input: gnot, output: gns, quote, settings: DEFAULT_SWAP_SETTINGS });

    now += SWAP_REVIEW_TTL_MS + 1;
    await expectCode(service.submit(prepared, { gasWanted: '5000000', gasFee: '5000ugnot' }), AppErrorCode.SWAP_PRICE_MOVED);
    expect(dryExpressions).toHaveLength(1);
    expect(env.gno.state.broadcasts).toHaveLength(0);
  });

  it('blocks tokens whose API decimals disagree with the chain, expired quotes and tampered routes', async () => {
    const mismatch = await setup({ decimals: { [GNS]: 8 } });
    const quote = await mismatch.service.getQuote({ network: mismatch.network, input: mismatch.gnot, output: mismatch.gns, exactType: 'EXACT_IN', amount: '1000000' });
    const input = { account: mismatch.account, network: mismatch.network, input: mismatch.gnot, output: mismatch.gns, settings: DEFAULT_SWAP_SETTINGS };

    await expectCode(mismatch.service.prepare({ ...input, quote }), AppErrorCode.SWAP_INVALID_TOKEN);
    await expectCode(mismatch.service.prepare({ ...input, quote: { ...quote, routeArr: `${WUGNOT}:${GNS}:500` } }), AppErrorCode.SWAP_PRICE_MOVED);
    now += SWAP_QUOTE_TTL_MS + 1;
    await expectCode(mismatch.service.prepare({ ...input, quote }), AppErrorCode.SWAP_PRICE_MOVED);
  });

  describe('on-chain token metadata', () => {
    afterEach(() => jest.restoreAllMocks());

    // Curated list entry for GNS that the asset repository overlays on registry metadata.
    const curateGns = (decimals: number): void => {
      const curated = { id: GNS, networkId: 'gnoland1', family: ChainFamily.GNO, type: TokenType.GRC20, name: 'Gnoswap Curated', symbol: 'cGNS', decimals, isNative: false };

      jest.spyOn(GnoTokenResourceRepository.prototype, 'get').mockResolvedValue({ tokens: [curated], complete: true, routes: {} });
    };

    const prepareGns = async (options: Parameters<typeof installGnoswapFakes>[1]) => {
      const env = await setup(options);
      const quote = await env.service.getQuote({ network: env.network, input: env.gnot, output: env.gns, exactType: 'EXACT_IN', amount: '1000000' });

      return env.service.prepare({ account: env.account, network: env.network, input: env.gnot, output: env.gns, quote, settings: DEFAULT_SWAP_SETTINGS });
    };

    it('refuses API decimals that match the curated list but not the registry', async () => {
      curateGns(6);
      await expectCode(prepareGns({ decimals: { [GNS]: 8 } }), AppErrorCode.SWAP_INVALID_TOKEN);
    });

    it('accepts API decimals that match the registry despite stale curated decimals, under the registry symbol and name', async () => {
      curateGns(8);
      const prepared = await prepareGns({});

      expect(prepared.output).toMatchObject({ id: GNS, decimals: 6, symbol: 'GNS', name: 'GNS' });
    });
  });

  describe('approve form', () => {
    const curated = { tokens: [], complete: true, routes: { [GNS]: { approve: { name: 'Approve', args: ['$spender', '$amount'] } } } };

    afterEach(() => jest.restoreAllMocks());

    const prepareGrc20 = async () => {
      let listAvailable = true;

      jest.spyOn(GnoTokenResourceRepository.prototype, 'get').mockImplementation(async () => {
        if (!listAvailable) {
          throw new Error('token list unavailable');
        }

        return curated;
      });
      const env = await setup({ grc20Balances: { [GNS]: '100000000' } });
      const quote = await env.service.getQuote({ network: env.network, input: env.gns, output: env.gnot, exactType: 'EXACT_IN', amount: '1000000' });
      const prepared = await env.service.prepare({ account: env.account, network: env.network, input: env.gns, output: env.gnot, quote, settings: DEFAULT_SWAP_SETTINGS });

      listAvailable = false;
      return { ...env, prepared };
    };

    it('signs the curated approve prepared for the review even when the token list is gone at confirm', async () => {
      const { service, env, prepared } = await prepareGrc20();

      expect(prepared.approveRoute).toEqual(curated.routes[GNS].approve);
      await service.submit(prepared, { gasWanted: '5000000', gasFee: '5000ugnot' });
      const tx = Tx.decode(fromBase64(env.gno.state.broadcasts[0]));
      const approve = MsgCall.decode(tx.messages[0].value);

      expect(tx.messages[0].type_url).toBe('/vm.m_call');
      expect([approve.pkg_path, approve.func, approve.args]).toEqual(['gno.land/r/gnoswap/gns', 'Approve', [ROUTER_ADDRESS, '1000000']]);
    });

    it('refuses to sign messages that differ from the reviewed draft', async () => {
      const { service, env, prepared } = await prepareGrc20();
      const repository = env.container.chainRegistry.swap(prepared.network)!;
      const reviewed = prepared.draft.messages as { type: string; value: Record<string, unknown> }[];

      jest.spyOn(repository, 'buildSwapMessages').mockResolvedValueOnce([{ ...reviewed[0], value: { ...reviewed[0].value, func: 'Transfer' } }, ...reviewed.slice(1)]);
      await expectCode(service.submit(prepared, { gasWanted: '5000000', gasFee: '5000ugnot' }), AppErrorCode.SWAP_PRICE_MOVED);
      expect(env.gno.state.broadcasts).toHaveLength(0);
    });
  });

  it('reviews GRC20 tokens under the chain symbol and name, not the API metadata', async () => {
    const { service, network, account, gnot, gns } = await setup();
    const spoofed = { ...gns, symbol: 'USDC', name: 'USD Coin' };
    const quote = await service.getQuote({ network, input: gnot, output: spoofed, exactType: 'EXACT_IN', amount: '1000000' });
    const prepared = await service.prepare({ account, network, input: gnot, output: spoofed, quote, settings: DEFAULT_SWAP_SETTINGS });

    expect(prepared.output).toMatchObject({ id: GNS, symbol: 'GNS', name: 'GNS' });
    expect(prepared.input).toBe(gnot);
  });

  it('checks the input balance together with the fee before signing', async () => {
    const { service, network, account, gnot, gns, env, address } = await setup();
    const quote = await service.getQuote({ network, input: gnot, output: gns, exactType: 'EXACT_IN', amount: '1000000' });
    const prepared = await service.prepare({ account, network, input: gnot, output: gns, quote, settings: DEFAULT_SWAP_SETTINGS });

    env.gno.state.balances[address] = '1000500ugnot';
    await expectCode(service.submit(prepared, { gasWanted: '5000000', gasFee: '5000ugnot' }), AppErrorCode.INSUFFICIENT_BALANCE);
    expect(env.gno.state.broadcasts).toHaveLength(0);
  });

  describe('EXACT_OUT', () => {
    const quoteOut = async (options: Parameters<typeof installGnoswapFakes>[1] = {}) => {
      const env = await setup(options);
      const quote = await env.service.getQuote({ network: env.network, input: env.gnot, output: env.gns, exactType: 'EXACT_OUT', amount: '4000000' });

      return { ...env, quote };
    };

    it('quotes the input with the output as the exact amount and an unbounded max in', async () => {
      const { quote, routeBodies, dryExpressions } = await quoteOut();

      expect(routeBodies).toEqual([{ inputTokenPath: WUGNOT, outputTokenPath: GNS, exactType: 'EXACT_OUT', amount: '4000000' }]);
      expect(dryExpressions[0]).toMatch(/^DrySwapRoute\("[^"]+", "[^"]+", "4000000", "EXACT_OUT", "[^"]+", "50,50", "9223372036854775807"\)$/);
      expect(quote).toMatchObject({ exactType: 'EXACT_OUT', requestedAmount: '4000000', amountIn: '962929', amountOut: '4000000' });
    });

    it('keeps the cheapest pool route and rejects an output outside the rounding tolerance', async () => {
      const inputs = ['990000', '970000', '999999'];
      const cheapest = await setup({ route: null, drySwap: () => `("${inputs.shift() ?? '1'}" string)\n("4000000" string)\n(undefined)` });

      expect((await cheapest.service.getQuote({ network: cheapest.network, input: cheapest.gnot, output: cheapest.gns, exactType: 'EXACT_OUT', amount: '4000000' })).amountIn).toBe('970000');

      const short = await setup({ drySwap: '("962929" string)\n("3999000" string)\n(undefined)' });

      await expectCode(short.service.getQuote({ network: short.network, input: short.gnot, output: short.gns, exactType: 'EXACT_OUT', amount: '4000000' }), AppErrorCode.SWAP_NO_ROUTE);
    });

    it('wraps and approves amountInMax, swaps for the exact output and clears the allowance', async () => {
      const { service, network, account, gnot, gns, env, quote } = await quoteOut();
      const prepared = await service.prepare({ account, network, input: gnot, output: gns, quote, settings: DEFAULT_SWAP_SETTINGS });

      expect(prepared).toMatchObject({ maxAmountIn: '967744', minAmountOut: '3999997' });
      await service.submit(prepared, { gasWanted: '5000000', gasFee: '5000ugnot' });
      const calls = Tx.decode(fromBase64(env.gno.state.broadcasts[0])).messages.map(message => MsgCall.decode(message.value));

      expect(calls.map(call => [call.func, call.send, call.args])).toEqual([
        ['Deposit', '967744ugnot', []],
        ['Approve', '', [ROUTER_ADDRESS, '967744']],
        ['ExactOutSwapRoute', '', [WUGNOT, GNS, '4000000', quote.routeArr, '50,50', '967744', String(now / 1000 + 600), '']],
        ['Approve', '', [ROUTER_ADDRESS, '0']],
      ]);
    });

    it('dry-runs and signs the requested output, not a dry-run output rounded below it', async () => {
      const { service, network, account, gnot, gns, env, dryExpressions } = await setup({ drySwap: '("962929" string)\n("3999999" string)\n(undefined)' });
      const quote = await service.getQuote({ network, input: gnot, output: gns, exactType: 'EXACT_OUT', amount: '4000000' });
      const prepared = await service.prepare({ account, network, input: gnot, output: gns, quote, settings: DEFAULT_SWAP_SETTINGS });

      expect(quote.amountOut).toBe('3999999');
      expect(prepared.minAmountOut).toBe('3999997');
      await service.submit(prepared, { gasWanted: '5000000', gasFee: '5000ugnot' });
      // The confirmation dry run targets the request too.
      expect(dryExpressions).toHaveLength(2);
      expect(dryExpressions[1]).toMatch(/^DrySwapRoute\("[^"]+", "[^"]+", "4000000", "EXACT_OUT"/);
      const calls = Tx.decode(fromBase64(env.gno.state.broadcasts[0])).messages.map(message => MsgCall.decode(message.value));

      expect(calls.find(call => call.func === 'ExactOutSwapRoute')!.args[2]).toBe('4000000');
    });

    it('refuses to sign when the fresh dry run needs more than amountInMax', async () => {
      const inputs = ['962929', '970000'];
      const { service, network, account, gnot, gns, env } = await setup({ drySwap: () => `("${inputs.shift() ?? '970000'}" string)\n("4000000" string)\n(undefined)` });
      const quote = await service.getQuote({ network, input: gnot, output: gns, exactType: 'EXACT_OUT', amount: '4000000' });
      const prepared = await service.prepare({ account, network, input: gnot, output: gns, quote, settings: DEFAULT_SWAP_SETTINGS });

      await expectCode(service.submit(prepared, { gasWanted: '5000000', gasFee: '5000ugnot' }), AppErrorCode.SWAP_PRICE_MOVED);
      expect(env.gno.state.broadcasts).toHaveLength(0);
    });

    it('checks the balance against amountInMax plus the fee', async () => {
      const { service, network, account, gnot, gns, env, address, quote } = await quoteOut();
      const prepared = await service.prepare({ account, network, input: gnot, output: gns, quote, settings: DEFAULT_SWAP_SETTINGS });

      env.gno.state.balances[address] = '970000ugnot';
      await expectCode(service.submit(prepared, { gasWanted: '5000000', gasFee: '5000ugnot' }), AppErrorCode.INSUFFICIENT_BALANCE);
    });
  });

  describe('maxInputAmount', () => {
    const estimate = (storageDeposit = '0'): FeeEstimate => ({ gasUsed: '1000000', gasPrice: '0.001', denom: 'ugnot', policy: GNO_FEE_POLICY, storageDeposit });
    const maxOf = async (balance: string, options: { estimate?: FeeEstimate | Error; output?: boolean } = {}) => {
      const env = await setup();
      const spy = jest.spyOn(env.env.container.transactionService, 'estimateFee');

      if (options.estimate instanceof Error) {
        spy.mockRejectedValue(options.estimate);
      }
      else {
        spy.mockResolvedValue(options.estimate ?? estimate());
      }

      const result = env.service.maxInputAmount({
        account: env.account, network: env.network, input: env.gnot, output: options.output === false ? undefined : env.gns, balance, settings: DEFAULT_SWAP_SETTINGS,
      });

      return { ...env, spy, result };
    };

    it('keeps back the simulated fee times the send margin plus the storage deposit', async () => {
      const { result, spy } = await maxOf('100000000', { estimate: estimate('2500000') });

      // AVERAGE: 1,100,000 gas at 0.001 = 1,100 ugnot, x1.2 = 1,320 ugnot; plus the 2.5 GNOT deposit.
      await expect(result).resolves.toEqual({ amount: '97498680', approximate: false });
      const draft = spy.mock.calls[0][0] as TransactionDraft<{ value: { func: string; send: string; args: string[] | null } }>;

      // The probe is the real wrap/approve/swap tx for balance minus the bundled reserve.
      expect(draft.messages.map(message => message.value.func)).toEqual(['Deposit', 'Approve', 'ExactInSwapRoute']);
      expect(draft.messages[0].value.send).toBe('99000000ugnot');
    });

    it('refuses when the deposit or fee leaves nothing to swap', async () => {
      await expectCode((await maxOf('100000000', { estimate: estimate('99999000') })).result, AppErrorCode.INSUFFICIENT_BALANCE);
      await expectCode((await maxOf('1500')).result, AppErrorCode.INSUFFICIENT_BALANCE);
      await expectCode((await maxOf('900')).result, AppErrorCode.INSUFFICIENT_BALANCE);
    });

    it('falls back to the bundled reserve and flags the amount as approximate', async () => {
      await expect((await maxOf('100000000', { estimate: new Error('simulate failed') })).result).resolves.toEqual({ amount: '99000000', approximate: true });

      const noOutput = await maxOf('100000000', { output: false });

      await expect(noOutput.result).resolves.toEqual({ amount: '99000000', approximate: true });
      expect(noOutput.spy).not.toHaveBeenCalled();
    });

    it('returns the whole balance for GRC20 input', async () => {
      const { service, account, network, gns, gnot } = await setup();

      await expect(service.maxInputAmount({ account, network, input: gns, output: gnot, balance: '5000000', settings: DEFAULT_SWAP_SETTINGS })).resolves.toEqual({ amount: '5000000', approximate: false });
    });
  });
});
