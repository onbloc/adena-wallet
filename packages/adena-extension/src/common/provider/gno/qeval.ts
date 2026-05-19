/**
 * Helpers for composing Gno `vm/qeval` expressions and decoding the raw text
 * the node returns. A qeval response looks like a sequence of `(value type)`
 * tuples — one per return value — joined by newlines:
 *
 *   ("hello" string)
 *   (42 int64)
 *
 * String values are double-quoted with Go-style escapes; numeric, boolean and
 * nil values are bare tokens. Slice and struct literals come back as Go
 * literals (e.g. `slice[("a" string),("b" string)]`) which is awkward to parse,
 * so for collections we recommend evaluating an IIFE that marshals to JSON.
 */

const GNO_RAW = Symbol('gno-raw');

export type GnoArg = string | number | bigint | boolean | null | GnoRawArg;

interface GnoRawArg {
  [GNO_RAW]: true;
  value: string;
}

/**
 * Wrap a string so {@link formatGnoArg} inlines it verbatim instead of quoting
 * it. Use for variable references or sub-expressions: `gnoRaw('addr')` becomes
 * `addr` in the generated source.
 */
export const gnoRaw = (value: string): GnoRawArg => ({ [GNO_RAW]: true, value });

/**
 * Quote a value as a Go literal suitable for embedding in a qeval expression.
 * Strings are escaped per Go's interpreted-string-literal rules.
 */
export const gnoLiteral = (value: Exclude<GnoArg, GnoRawArg>): string => {
  if (value === null) return 'nil';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(`gnoLiteral: non-finite number ${value} is not representable in Gno`);
    }
    return `${value}`;
  }
  if (typeof value === 'bigint') return value.toString(10);
  return escapeGnoString(value);
};

export const formatGnoArg = (arg: GnoArg): string => {
  if (typeof arg === 'object' && arg !== null && GNO_RAW in arg) {
    return arg.value;
  }
  return gnoLiteral(arg as Exclude<GnoArg, GnoRawArg>);
};

const escapeGnoString = (value: string): string => {
  let out = '"';
  for (const ch of value) {
    switch (ch) {
      case '\\':
        out += '\\\\';
        break;
      case '"':
        out += '\\"';
        break;
      case '\n':
        out += '\\n';
        break;
      case '\r':
        out += '\\r';
        break;
      case '\t':
        out += '\\t';
        break;
      default: {
        const code = ch.charCodeAt(0);
        // Escape other control characters; leave printable Unicode as-is.
        if (code < 0x20 || code === 0x7f) {
          out += `\\x${code.toString(16).padStart(2, '0')}`;
        } else {
          out += ch;
        }
      }
    }
  }
  return out + '"';
};

export interface QEvalTuple {
  raw: string;
  value: string;
  type: string;
}

/**
 * Split a qeval response into its `(value type)` tuples. Each tuple keeps the
 * raw value token (still quoted/escaped if it is a string) and the trailing
 * type name, so callers can dispatch on type and decode the value safely.
 */
export const parseQEvalResult = (response: string): QEvalTuple[] => {
  const tuples: QEvalTuple[] = [];
  let i = 0;
  while (i < response.length) {
    // Skip whitespace and tuple separators.
    while (i < response.length && /\s/.test(response[i])) i++;
    if (i >= response.length) break;
    if (response[i] !== '(') {
      throw new Error(`parseQEvalResult: expected "(" at offset ${i} in ${JSON.stringify(response)}`);
    }
    const start = i;
    i++; // consume '('

    // Value token: either a quoted string or a bare token up to whitespace.
    let value: string;
    if (response[i] === '"') {
      const quoteStart = i;
      i++;
      while (i < response.length) {
        if (response[i] === '\\') {
          i += 2;
          continue;
        }
        if (response[i] === '"') {
          i++;
          break;
        }
        i++;
      }
      value = response.slice(quoteStart, i);
    } else {
      const tokenStart = i;
      while (i < response.length && !/\s/.test(response[i]) && response[i] !== ')') i++;
      value = response.slice(tokenStart, i);
    }

    // Skip whitespace between value and type.
    while (i < response.length && /\s/.test(response[i])) i++;

    // Type token: read until the closing ')'.
    const typeStart = i;
    let depth = 0;
    while (i < response.length) {
      const ch = response[i];
      if (ch === '(') depth++;
      else if (ch === ')') {
        if (depth === 0) break;
        depth--;
      }
      i++;
    }
    const type = response.slice(typeStart, i).trim();

    if (response[i] !== ')') {
      throw new Error(`parseQEvalResult: unterminated tuple starting at offset ${start}`);
    }
    i++; // consume ')'

    tuples.push({ raw: response.slice(start, i), value, type });
  }
  return tuples;
};

/**
 * Decode a Go interpreted string literal (the `"..."` form qeval returns for
 * string values). Throws if the input is not a quoted string.
 */
export const decodeGnoString = (token: string): string => {
  if (token.length < 2 || token[0] !== '"' || token[token.length - 1] !== '"') {
    throw new Error(`decodeGnoString: expected quoted string, got ${JSON.stringify(token)}`);
  }
  let out = '';
  for (let i = 1; i < token.length - 1; i++) {
    const ch = token[i];
    if (ch !== '\\') {
      out += ch;
      continue;
    }
    const next = token[++i];
    switch (next) {
      case '\\':
        out += '\\';
        break;
      case '"':
        out += '"';
        break;
      case 'n':
        out += '\n';
        break;
      case 'r':
        out += '\r';
        break;
      case 't':
        out += '\t';
        break;
      case 'x': {
        const hex = token.slice(i + 1, i + 3);
        out += String.fromCharCode(parseInt(hex, 16));
        i += 2;
        break;
      }
      case 'u': {
        const hex = token.slice(i + 1, i + 5);
        out += String.fromCharCode(parseInt(hex, 16));
        i += 4;
        break;
      }
      default:
        out += next;
    }
  }
  return out;
};

/** Decode the first tuple in a qeval response as a string. */
export const decodeQEvalString = (response: string): string => {
  const [first] = parseQEvalResult(response);
  if (!first) throw new Error('decodeQEvalString: empty qeval response');
  return decodeGnoString(first.value);
};

/**
 * Decode the first tuple as an integer. Returns a `bigint` so int64 values
 * outside `Number.MAX_SAFE_INTEGER` survive the round trip; callers that know
 * the value fits in a JS number can `Number(...)` it themselves.
 */
export const decodeQEvalInt = (response: string): bigint => {
  const [first] = parseQEvalResult(response);
  if (!first) throw new Error('decodeQEvalInt: empty qeval response');
  if (!/^-?\d+$/.test(first.value)) {
    throw new Error(`decodeQEvalInt: ${JSON.stringify(first.value)} is not an integer literal`);
  }
  return BigInt(first.value);
};

/** Decode the first tuple as a boolean. */
export const decodeQEvalBool = (response: string): boolean => {
  const [first] = parseQEvalResult(response);
  if (!first) throw new Error('decodeQEvalBool: empty qeval response');
  if (first.value === 'true') return true;
  if (first.value === 'false') return false;
  throw new Error(`decodeQEvalBool: ${JSON.stringify(first.value)} is not a boolean`);
};

/**
 * Decode the first tuple by JSON-parsing its string value. Use this together
 * with an IIFE that returns `string(jsonBytes)` — much more reliable than
 * trying to parse Gno's native slice/struct printout.
 */
export const decodeQEvalJSON = <T = unknown>(response: string): T => {
  const text = decodeQEvalString(response);
  return JSON.parse(text) as T;
};
