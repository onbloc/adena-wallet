import { HttpRequest } from '../../src/infrastructure/http/http-client';
import poolsDev from '../fixtures/gnoswap/pools.gnoswap.json';
import prices from '../fixtures/gnoswap/prices.gnoland-1.json';
import qeval from '../fixtures/gnoswap/qeval.json';
import routeMainnet from '../fixtures/gnoswap/route-mainnet.json';
import routeOutMainnet from '../fixtures/gnoswap/route-out-mainnet.json';
import metas from '../fixtures/gnoswap/token-metas.gnoland-1.json';
import { TestEnv } from './render-screen';

export const GNOSWAP_API = 'https://api.gnoswap.io/v1';
export const ROUTER = 'gno.land/r/gnoswap/router';
export const WUGNOT = 'gno.land/r/gnoland/wugnot.wugnot';
export const GNS = 'gno.land/r/gnoswap/gns.GNS';
export const GNOMIC = 'gno.land/r/nym-thegnomic001/gnomic.GNOMIC';
export const ROUTER_ADDRESS = 'g1vc883gshu5z7ytk5cdynhc8c2dh67pdp4cszkp';

export { metas, poolsDev, prices, qeval, routeMainnet };

export interface GnoswapFakeOptions {
  // Raw `/api/route` answer, or a function of the POST body; `null` makes the route API fail.
  route?: unknown | null | ((body: Record<string, string>) => unknown);
  // Raw DrySwapRoute output, or a function of the qeval expression.
  drySwap?: string | ((expression: string) => string);
  // GRC20 balances returned by the registry, keyed by token path.
  grc20Balances?: Record<string, string>;
  // On-chain decimals per token path (defaults to 6).
  decimals?: Record<string, number>;
  // Raw `/pools` data; `null` makes the pools API fail.
  pools?: unknown | null;
}

const keysOf = (expression: string): string[] => [...expression.matchAll(/Get\("([^"]+)"\)/g)].map(match => match[1]);

// Mainnet-shaped GnoSwap API and router answers captured from api.gnoswap.io and rpc.onbloc.xyz.
export const installGnoswapFakes = (env: TestEnv, options: GnoswapFakeOptions = {}): { routeBodies: Record<string, string>[]; dryExpressions: string[] } => {
  const routeBodies: Record<string, string>[] = [];
  const dryExpressions: string[] = [];

  env.http.on(`${GNOSWAP_API}/token-metas`, metas);
  env.http.on(`${GNOSWAP_API}/tokens/prices`, prices);

  if (options.pools !== null) {
    env.http.on(`${GNOSWAP_API}/pools`, { data: options.pools ?? poolsDev.data });
  }

  if (options.route !== null) {
    env.http.on(`${GNOSWAP_API}/api/route`, (init?: HttpRequest) => {
      const body = init?.body as Record<string, string>;

      routeBodies.push(body);
      return typeof options.route === 'function'
        ? (options.route as (b: Record<string, string>) => unknown)(body)
        : options.route ?? (body.exactType === 'EXACT_OUT' ? routeOutMainnet : routeMainnet);
    });
  }

  env.gno.state.evaluate = (pkgPath: string, expression: string): string => {
    if (pkgPath === ROUTER && expression === 'GetSwapFee()') {
      return qeval.getSwapFee;
    }

    if (pkgPath === ROUTER && expression.startsWith('DrySwapRoute(')) {
      dryExpressions.push(expression);

      if (typeof options.drySwap === 'function') {
        return options.drySwap(expression);
      }

      if (options.drySwap !== undefined) {
        return options.drySwap;
      }

      // The captured split answers, echoing the exact amount so any amount fills.
      const amount = /^DrySwapRoute\("[^"]*", "[^"]*", "(\d+)"/.exec(expression)?.[1] ?? '1000000';

      return expression.includes('"EXACT_OUT"')
        ? qeval.drySwapExactOutSplit.replace('"4000000"', `"${amount}"`)
        : qeval.drySwapSplit.replace('"1000000"', `"${amount}"`);
    }

    if (expression.includes('BalanceOf(')) {
      return keysOf(expression).map(key => `(true bool)\n(${options.grc20Balances?.[key] ?? '0'} int64)`).join('\n');
    }

    if (expression.includes('GetDecimals()')) {
      return keysOf(expression).map((key) => {
        const symbol = key.slice(key.lastIndexOf('.') + 1);

        return `("${symbol}" string)\n("${symbol}" string)\n(${options.decimals?.[key] ?? 6} int)`;
      }).join('\n');
    }

    return '';
  };

  return { routeBodies, dryExpressions };
};
