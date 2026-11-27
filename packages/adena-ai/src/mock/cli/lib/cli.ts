import { GNO_MAINNET_CHAIN } from '../../../harness/mcp';
import { DEFAULT_ONBLOC_ACCOUNT, DEFAULT_ONBLOC_MCP_URL, resolveOnblocSettings } from '../../app/onblocSettings';

/** A custom network must be paired with a host-supplied endpoint. */
export function resolveOnblocEnv(env: Readonly<Record<string, string | undefined>>) {
  const chainId = env.EXPO_PUBLIC_ONBLOC_CHAIN_ID ?? GNO_MAINNET_CHAIN;
  if (chainId !== GNO_MAINNET_CHAIN && !env.EXPO_PUBLIC_ONBLOC_MCP_URL?.trim()) {
    throw new Error('A non-mainnet EXPO_PUBLIC_ONBLOC_CHAIN_ID requires EXPO_PUBLIC_ONBLOC_MCP_URL.');
  }
  const settings = resolveOnblocSettings(
    env.EXPO_PUBLIC_ONBLOC_MCP_URL?.trim() || DEFAULT_ONBLOC_MCP_URL,
    env.EXPO_PUBLIC_ONBLOC_ACCOUNT?.trim() || DEFAULT_ONBLOC_ACCOUNT,
    chainId
  );
  const error = settings.chainIdError ?? settings.endpointError ?? settings.accountError;
  if (error) throw new Error(`Invalid Onbloc configuration: ${error}`);
  return { endpoint: settings.endpoint, account: settings.account, chainId: settings.chainId };
}

export type ParsedArgs = { values: Map<string, string>; flags: Set<string> };

/** Parses `--key value` options and bare `--flag`s; rejects anything else. */
export function parseArgs(
  argv: string[],
  spec: { values: readonly string[]; flags?: readonly string[] }
): ParsedArgs {
  const values = new Map<string, string>();
  const flags = new Set<string>();
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) throw new Error(`Unexpected argument: ${arg}`);
    const name = arg.slice(2);
    if (spec.flags?.includes(name)) {
      flags.add(name);
    } else if (spec.values.includes(name)) {
      if (i + 1 >= argv.length) throw new Error(`--${name} needs a value`);
      values.set(name, argv[++i]);
    } else {
      throw new Error(`Unknown option: --${name}`);
    }
  }
  return { values, flags };
}

/** Chat is read-only unless the host explicitly enables wallet preparation. */
export function parseChatArgs(argv: string[]): ParsedArgs & { allowTransactionPreparation: boolean } {
  const parsed = parseArgs(argv, {
    values: ['prompt', 'url', 'model', 'temperature', 'max-tokens', 'context-tokens', 'system-file'],
    flags: ['onbloc', 'allow-transaction-preparation'],
  });
  const allowTransactionPreparation = parsed.flags.has('allow-transaction-preparation');
  if (allowTransactionPreparation && !parsed.flags.has('onbloc')) {
    throw new Error('--allow-transaction-preparation requires --onbloc.');
  }
  return { ...parsed, allowTransactionPreparation };
}

/** A number option within [min, max]; `fallback` when it was not given. */
export function boundedNumber(
  values: Map<string, string>,
  key: string,
  fallback: number,
  min: number,
  max: number,
  integer = true
): number {
  const text = values.get(key);
  if (text === undefined) return fallback;
  const value = Number(text);
  const ok = text.trim() !== '' && Number.isFinite(value) && value >= min && value <= max;
  if (!ok || (integer && !Number.isInteger(value))) {
    throw new Error(`--${key} must be ${integer ? 'an integer' : 'a number'} in [${min}, ${max}]`);
  }
  return value;
}
