import { Grc20RegistryConfig } from '../../../resources';
import { GnoMessage, GnoMessageType } from './gno-messages';
import { gnoLiteral } from './gno-qeval';
import { Grc20RouteFunc } from './gno-token-resource.repository';

export interface Grc20TransferInput {
  caller: string;
  registryKey: string;
  pkgPath: string;
  toAddress: string;
  amount: string;
  route?: Grc20RouteFunc;
  config: Grc20RegistryConfig;
}

const PLACEHOLDERS = new Set(['to', 'from', 'spender', 'owner', 'amount']);

// Resolves "$to"/"$amount" placeholders; unknown or empty placeholders abort the route.
export const resolveRouteArgs = (route: Grc20RouteFunc, values: Record<string, string | undefined>): string[] | null => {
  const resolved: string[] = [];

  for (const arg of route.args) {
    if (arg.startsWith('$$')) {
      resolved.push(arg.slice(1));
      continue;
    }

    if (!arg.startsWith('$')) {
      resolved.push(arg);
      continue;
    }

    const key = arg.slice(1);
    const value = PLACEHOLDERS.has(key) ? values[key] : undefined;

    if (!value) {
      return null;
    }

    resolved.push(value);
  }

  return resolved;
};

// Same precedence as the extension: token route, chain helper realm, then a registry MsgRun.
export const buildGrc20TransferMessage = (input: Grc20TransferInput): GnoMessage => {
  const { caller, registryKey, pkgPath, toAddress, amount, route, config } = input;

  const routeArgs = route ? resolveRouteArgs(route, { to: toAddress, amount }) : null;

  if (route && routeArgs) {
    return {
      type: GnoMessageType.VM_CALL,
      value: { caller, send: '', max_deposit: '', pkg_path: pkgPath, func: route.name, args: routeArgs },
    };
  }

  if (config.helperPath) {
    return {
      type: GnoMessageType.VM_CALL,
      value: { caller, send: '', max_deposit: '', pkg_path: config.helperPath, func: 'Transfer', args: [registryKey, toAddress, amount] },
    };
  }

  const aliases = config.registries.map((registry, index) => ({ alias: `grc20reg${index}`, path: registry.path }));
  const body = [
    'package main',
    '',
    'import (',
    ...aliases.map(({ alias, path }) => `\t${alias} ${gnoLiteral(path)}`),
    ')',
    '',
    'func main(cur realm) {',
    ...aliases.map(({ alias }) =>
      `\tif ${alias}.Get(${gnoLiteral(registryKey)}) != nil { ${alias}.Transfer(0, cur, ${gnoLiteral(registryKey)}, address(${gnoLiteral(toAddress)}), ${amount}); return }`),
    `\tpanic("token is not registered: " + ${gnoLiteral(registryKey)})`,
    '}',
    '',
  ].join('\n');

  return {
    type: GnoMessageType.VM_RUN,
    value: { caller, send: '', max_deposit: '', package: { name: 'main', path: '', files: [{ name: 'main.gno', body }] } },
  };
};
