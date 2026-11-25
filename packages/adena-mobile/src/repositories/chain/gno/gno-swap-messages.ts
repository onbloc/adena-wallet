import { isRawAmount, SwapType } from '../../../domain/swap';
import { DexSwapConfig, Grc20RegistryConfig, isTokenPath } from '../../../resources';
import { isValidAddress } from '../../../utils/address';
import { resolveRouteArgs } from './gno-grc20-transfer';
import { GnoMessage, GnoMessageType, VmCallValue } from './gno-messages';
import { gnoLiteral } from './gno-qeval';
import { parseRegistryKey } from './gno-token-key';
import { Grc20RouteFunc } from './gno-token-resource.repository';

export interface SwapMessageToken {
  // Native coins are wrapped first; GRC20s go straight to the router.
  native: boolean;
  // Registry key the router trades ("{pkgPath}.{symbol}", wugnot for the native coin).
  swapPath: string;
  // Curated approve route of the token realm, if any.
  approveRoute?: Grc20RouteFunc;
}

export interface SwapMessagesInput {
  caller: string;
  config: DexSwapConfig;
  registry: Grc20RegistryConfig;
  input: SwapMessageToken;
  output: SwapMessageToken;
  exactType: SwapType;
  // EXACT_IN: the exact input. EXACT_OUT: amountInMax, which is wrapped and approved.
  amountIn: string;
  // EXACT_OUT only: the exact output requested from the router.
  amountOut?: string;
  // Guaranteed delivery: EXACT_IN amountOutMin, EXACT_OUT the output minus the router's rounding tolerance.
  minAmountOut: string;
  routeArr: string;
  quoteArr: string;
  // Unix seconds.
  deadline: number;
}

const call = (caller: string, pkgPath: string, func: string, args: string[] | null, send = ''): GnoMessage => ({
  type: GnoMessageType.VM_CALL,
  value: { caller, send, max_deposit: '', pkg_path: pkgPath, func, args } satisfies VmCallValue,
});

// MsgRun approve through grc20reg: the run realm acts as the signer, so the allowance is the signer's.
const registryApprove = (caller: string, registry: Grc20RegistryConfig, tokenPath: string, spender: string, amount: string): GnoMessage => {
  const aliases = registry.registries.map((item, index) => ({ alias: `grc20reg${index}`, path: item.path }));
  const body = [
    'package main',
    '',
    'import (',
    ...aliases.map(({ alias, path }) => `\t${alias} ${gnoLiteral(path)}`),
    ')',
    '',
    'func main(cur realm) {',
    ...aliases.map(({ alias }) =>
      `\tif ${alias}.Get(${gnoLiteral(tokenPath)}) != nil { ${alias}.Approve(0, cur, ${gnoLiteral(tokenPath)}, address(${gnoLiteral(spender)}), ${amount}); return }`),
    `\tpanic("token is not registered: " + ${gnoLiteral(tokenPath)})`,
    '}',
    '',
  ].join('\n');

  return {
    type: GnoMessageType.VM_RUN,
    value: { caller, send: '', max_deposit: '', package: { name: 'main', path: '', files: [{ name: 'main.gno', body }] } },
  };
};

const approveMessage = (input: SwapMessagesInput, amountIn: string): GnoMessage => {
  const { caller, config, registry } = input;
  const token = input.input;
  const spender = config.routerAddress;

  // wugnot exposes a crossing Approve(spender, amount) for its own token.
  if (token.native) {
    return call(caller, config.wrappedNative.packagePath, 'Approve', [spender, amountIn]);
  }

  const pkgPath = parseRegistryKey(token.swapPath)?.pkgPath;
  const routeArgs = token.approveRoute ? resolveRouteArgs(token.approveRoute, { spender, amount: amountIn }) : null;

  if (token.approveRoute && routeArgs && pkgPath) {
    return call(caller, pkgPath, token.approveRoute.name, routeArgs);
  }

  return registryApprove(caller, registry, token.swapPath, spender, amountIn);
};

// A MsgCall's realm function or a MsgRun's code; amounts and the deadline are call args and left out.
export const swapMessageTargets = (messages: GnoMessage[]): string[] => messages.map((message) => {
  switch (message.type) {
    case GnoMessageType.VM_CALL:
      return `${message.type} ${message.value.pkg_path}.${message.value.func}`;
    case GnoMessageType.VM_RUN:
      return `${message.type} ${JSON.stringify(message.value.package.files)}`;
    default:
      return `${message.type} ${JSON.stringify(message.value)}`;
  }
});

const isPositiveRaw = (value: string | undefined): value is string => isRawAmount(value) && BigInt(value) > 0n;

// EXACT_IN: [wugnot.Deposit] -> approve(amountIn) -> ExactInSwapRoute -> [wugnot.Withdraw(minOut)].
// EXACT_OUT: [wugnot.Deposit(max)] -> approve(max) -> ExactOutSwapRoute -> approve(0) -> [wugnot.Withdraw(minOut)].
// Withdraw must be a MsgCall (wugnot asserts an origin call), so only the guaranteed output is unwrapped.
export const buildSwapMessages = (input: SwapMessagesInput): GnoMessage[] => {
  const { caller, config, exactType, amountIn, amountOut, minAmountOut, routeArr, quoteArr, deadline } = input;
  const exactOut = exactType === SwapType.EXACT_OUT;

  if (!isValidAddress(caller) || !isValidAddress(config.routerAddress)) {
    throw new Error('invalid swap address');
  }

  if (!isPositiveRaw(amountIn) || !isPositiveRaw(minAmountOut) || (exactOut && (!isPositiveRaw(amountOut) || BigInt(minAmountOut) > BigInt(amountOut)))) {
    throw new Error('invalid swap amount');
  }

  if (exactType !== SwapType.EXACT_IN && !exactOut) {
    throw new Error('invalid swap type');
  }

  if (!isTokenPath(input.input.swapPath) || !isTokenPath(input.output.swapPath) || input.input.swapPath === input.output.swapPath) {
    throw new Error('invalid swap token');
  }

  if (!Number.isSafeInteger(deadline) || deadline <= 0 || !routeArr || !/^\d+(,\d+)*$/.test(quoteArr)) {
    throw new Error('invalid swap route');
  }

  if (input.input.native && BigInt(amountIn) < BigInt(config.wrappedNative.minDeposit)) {
    throw new Error('amount is below the wrap minimum');
  }

  const messages: GnoMessage[] = [];

  if (input.input.native) {
    messages.push(call(caller, config.wrappedNative.packagePath, 'Deposit', null, `${amountIn}${config.wrappedNative.denom}`));
  }

  messages.push(approveMessage(input, amountIn));
  messages.push(exactOut
    ? call(caller, config.routerPath, 'ExactOutSwapRoute', [input.input.swapPath, input.output.swapPath, amountOut as string, routeArr, quoteArr, amountIn, String(deadline), ''])
    : call(caller, config.routerPath, 'ExactInSwapRoute', [input.input.swapPath, input.output.swapPath, amountIn, routeArr, quoteArr, minAmountOut, String(deadline), '']));

  // The router only pulls what it used; clear the rest of the allowance.
  if (exactOut) {
    messages.push(approveMessage(input, '0'));
  }

  if (input.output.native) {
    messages.push(call(caller, config.wrappedNative.packagePath, 'Withdraw', [minAmountOut]));
  }

  return messages;
};
