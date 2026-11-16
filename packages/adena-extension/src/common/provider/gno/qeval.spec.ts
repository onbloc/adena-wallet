import {
  decodeGnoString,
  decodeQEvalTupleValue,
  gnoLiteral,
  parseFirstQEvalTuple,
  parseQEvalResult,
} from './qeval';

// The shapes below are verbatim `vm/qeval` replies from gno.land mainnet for
// `gno.land/r/gnoswap/gnft`.
const SINGLE_RESULT = '("GNOSWAP NFT" string)';
const TWO_RESULTS_NIL_ERROR = '("data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=" string)\n(undefined)';
const TWO_RESULTS_ERROR =
  '("" string)\n(&(struct{("token has no uri" string)} errors.errorString) *errors.errorString)';
const NON_WORD_TYPE = '("g1q6d4ns7zkr492rgl0pcgf5ajaf2dlz0nnptky3" .uverse.address)\n(undefined)';

/** The leading value and the untouched remainder, for terse assertions. */
function readFirst(response: string): { value: string; type: string; rest: string } {
  const parsed = parseFirstQEvalTuple(response);
  if (!parsed) {
    throw new Error(`expected a tuple in ${JSON.stringify(response)}`);
  }

  return {
    value: decodeQEvalTupleValue(parsed.tuple),
    type: parsed.tuple.type,
    rest: parsed.rest,
  };
}

describe('parseFirstQEvalTuple', () => {
  it('reads a single result and reports no remainder', () => {
    expect(readFirst(SINGLE_RESULT)).toEqual({ value: 'GNOSWAP NFT', type: 'string', rest: '' });
  });

  it('reads the value of a (value, error) pair and keeps the nil error tuple', () => {
    expect(readFirst(TWO_RESULTS_NIL_ERROR)).toEqual({
      value: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
      type: 'string',
      rest: '(undefined)',
    });
  });

  // A non-nil error prints as a nested struct literal, which is not a tuple —
  // reading the leading value must not depend on it parsing.
  it('reads the value even when the error tuple is a struct literal', () => {
    expect(readFirst(TWO_RESULTS_ERROR)).toEqual({
      value: '',
      type: 'string',
      rest: '(&(struct{("token has no uri" string)} errors.errorString) *errors.errorString)',
    });
  });

  it('reads a value whose type token is not a bare word', () => {
    expect(readFirst(NON_WORD_TYPE)).toEqual({
      value: 'g1q6d4ns7zkr492rgl0pcgf5ajaf2dlz0nnptky3',
      type: '.uverse.address',
      rest: '(undefined)',
    });
  });

  it('returns null for an empty response', () => {
    expect(parseFirstQEvalTuple('')).toBeNull();
    expect(parseFirstQEvalTuple('  \n ')).toBeNull();
  });
});

describe('parseQEvalResult', () => {
  it('still splits a response whose tuples are all well formed', () => {
    expect(parseQEvalResult(TWO_RESULTS_NIL_ERROR).map((tuple) => tuple.type)).toEqual([
      'string',
      '',
    ]);
  });
});

describe('decodeQEvalTupleValue', () => {
  it('unescapes a quoted string and leaves bare tokens alone', () => {
    expect(decodeQEvalTupleValue({ raw: '', value: '"a\\"b\\nc"', type: 'string' })).toBe('a"b\nc');
    expect(decodeQEvalTupleValue({ raw: '', value: '265', type: 'int64' })).toBe('265');
    expect(decodeQEvalTupleValue({ raw: '', value: 'undefined', type: '' })).toBe('undefined');
  });
});

describe('gnoLiteral round trip', () => {
  it('survives a token id carrying a quote', () => {
    const tokenId = 'a"b\\c';

    expect(decodeGnoString(gnoLiteral(tokenId))).toBe(tokenId);
  });
});
