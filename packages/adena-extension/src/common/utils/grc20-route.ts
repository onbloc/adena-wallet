import { Grc20Route, Grc20RouteFunc, Grc20RouteFuncs, Grc20RouteMap } from '@types';

// Operations the wallet knows how to build arguments for. The published set is
// open, so this is not a limit on what a realm may declare.
export const GRC20_ROUTE_OP = {
  TRANSFER: 'transfer',
  APPROVE: 'approve',
  TRANSFER_FROM: 'transfer_from',
} as const;

/** Runtime values a placeholder can resolve to. */
export interface Grc20RouteValues {
  to?: string;
  from?: string;
  spender?: string;
  owner?: string;
  amount?: string;
}

const PLACEHOLDER_KEYS = ['to', 'from', 'spender', 'owner', 'amount'] as const;

type PlaceholderKey = (typeof PLACEHOLDER_KEYS)[number];

const PLACEHOLDERS: Record<string, PlaceholderKey> = PLACEHOLDER_KEYS.reduce(
  (acc, key) => ({ ...acc, [`$${key}`]: key }),
  {},
);

const EXPORTED_FUNC_NAME = /^[A-Z][A-Za-z0-9_]*$/;

/**
 * Resolve one `args` element. An unknown placeholder (a typo such as
 * `$reciever`) is rejected rather than treated as a literal, which would put a
 * wrong argument on-chain.
 */
function resolveArg(arg: string, values: Grc20RouteValues): string | null {
  if (arg.startsWith('$$')) {
    return arg.slice(1);
  }

  if (!arg.startsWith('$')) {
    return arg;
  }

  const key = PLACEHOLDERS[arg];
  if (!key) {
    return null;
  }

  const value = values[key];
  return value === undefined || value === '' ? null : value;
}

/**
 * The `MsgCall` argument list for a route function, or `null` when a
 * placeholder is unknown or has no value. Callers fall back rather than send a
 * malformed call.
 */
export function resolveGrc20RouteArgs(
  routeFunc: Grc20RouteFunc,
  values: Grc20RouteValues,
): string[] | null {
  const resolved: string[] = [];

  for (const arg of routeFunc.args) {
    const value = resolveArg(arg, values);
    if (value === null) {
      return null;
    }
    resolved.push(value);
  }

  return resolved;
}

export function getGrc20RouteFunc(
  route: Grc20Route | null | undefined,
  op: string,
): Grc20RouteFunc | null {
  return route?.funcs?.[op] ?? null;
}

function parseRouteFunc(raw: unknown): Grc20RouteFunc | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const { name, args } = raw as { name?: unknown; args?: unknown };
  if (typeof name !== 'string' || !EXPORTED_FUNC_NAME.test(name)) {
    return null;
  }
  if (!Array.isArray(args) || args.some((arg) => typeof arg !== 'string')) {
    return null;
  }

  return { name, args: args as string[] };
}

/**
 * Normalize a `routes` value. Malformed operations are dropped rather than
 * failing the entry, so one bad route cannot take the token list down.
 */
export function parseGrc20Route(raw: unknown): Grc20Route | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const { funcs } = raw as { funcs?: unknown };
  if (!funcs || typeof funcs !== 'object') {
    return null;
  }

  const parsed: Grc20RouteFuncs = {};
  for (const [op, rawFunc] of Object.entries(funcs as Record<string, unknown>)) {
    const routeFunc = parseRouteFunc(rawFunc);
    if (routeFunc) {
      parsed[op] = routeFunc;
    }
  }

  return { funcs: parsed };
}

export function getGrc20Route(
  routes: Grc20RouteMap | null | undefined,
  registryKey: string | null | undefined,
): Grc20Route | null {
  if (!routes || !registryKey) {
    return null;
  }
  return routes[registryKey] ?? null;
}
