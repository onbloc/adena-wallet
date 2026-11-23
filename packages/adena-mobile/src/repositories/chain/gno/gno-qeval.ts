// Helpers for building `vm/qeval` expressions and decoding their textual results.

const LITERAL_ESCAPES: Record<string, string> = { '\\': '\\\\', '"': '\\"', '\n': '\\n', '\r': '\\r', '\t': '\\t' };

const DECODE_ESCAPES: Record<string, string> = { n: '\n', r: '\r', t: '\t' };
const HEX_ESCAPE_LENGTHS: Record<string, number> = { x: 2, u: 4 };

export const gnoLiteral = (value: string): string => {
  let out = '"';

  for (const ch of value) {
    const code = ch.charCodeAt(0);

    out += LITERAL_ESCAPES[ch]
      ?? (code < 0x20 || code === 0x7f ? `\\x${code.toString(16).padStart(2, '0')}` : ch);
  }

  return `${out}"`;
};

export const buildIife = (returnType: string, statements: string[], returnExpression: string): string =>
  `(func() ${returnType} { ${[...statements, `return ${returnExpression}`].join('; ')} })()`;

export interface QEvalTuple {
  value: string;
  type: string;
}

// Parses node output such as `(true bool)\n(12345 int64)\n("a,b" string)`.
export const parseQEvalResult = (response: string): QEvalTuple[] => {
  const tuples: QEvalTuple[] = [];
  let index = 0;

  while (index < response.length) {
    if (response[index] !== '(') {
      index++;
      continue;
    }

    index++;
    let value: string;

    if (response[index] === '"') {
      const start = index;

      index++;

      while (index < response.length && response[index] !== '"') {
        index += response[index] === '\\' ? 2 : 1;
      }

      index++;
      value = response.slice(start, index);
    }
    else {
      const start = index;

      while (index < response.length && !/\s/.test(response[index]) && response[index] !== ')') index++;

      value = response.slice(start, index);
    }

    while (index < response.length && /\s/.test(response[index])) index++;

    const typeStart = index;
    let depth = 0;

    while (index < response.length && !(response[index] === ')' && depth === 0)) {
      if (response[index] === '(') depth++;

      if (response[index] === ')') depth--;

      index++;
    }

    tuples.push({ value, type: response.slice(typeStart, index).trim() });
    index++;
  }

  return tuples;
};

// Decodes a Go string literal (including \x escapes) produced by qeval.
export const decodeGoString = (literal: string): string => {
  if (!literal.startsWith('"')) {
    return literal;
  }

  const body = literal.slice(1, -1);
  let out = '';

  for (let index = 0; index < body.length; index++) {
    const ch = body[index];

    if (ch !== '\\') {
      out += ch;
      continue;
    }

    const next = body[++index];
    const hexLength = HEX_ESCAPE_LENGTHS[next];

    if (hexLength) {
      out += String.fromCharCode(parseInt(body.slice(index + 1, index + 1 + hexLength), 16));
      index += hexLength;
    }
    else {
      out += DECODE_ESCAPES[next] ?? next;
    }
  }

  return out;
};
