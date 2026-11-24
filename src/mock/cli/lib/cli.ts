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
