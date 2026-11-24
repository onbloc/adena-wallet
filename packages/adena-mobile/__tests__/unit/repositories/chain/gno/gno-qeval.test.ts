import { buildIife, decodeGoString, gnoLiteral, parseQEvalResult } from '../../../../../src/repositories/chain/gno/gno-qeval';

describe('gnoLiteral', () => {
  it('quotes and escapes special characters', () => {
    expect(gnoLiteral('')).toBe('""');
    expect(gnoLiteral('a"b\\c')).toBe('"a\\"b\\\\c"');
    expect(gnoLiteral('\n\r\t')).toBe('"\\n\\r\\t"');
  });

  it('hex-escapes other control characters and DEL', () => {
    expect(gnoLiteral('\x00\x07\x1f\x7f')).toBe('"\\x00\\x07\\x1f\\x7f"');
  });

  it('keeps printable unicode, including astral characters', () => {
    expect(gnoLiteral('한글 😀')).toBe('"한글 😀"');
  });

  it('neutralizes injection attempts', () => {
    const literal = gnoLiteral('"); panic("x');

    expect(literal).toBe('"\\"); panic(\\"x"');
    expect(decodeGoString(literal)).toBe('"); panic("x');
  });
});

describe('buildIife', () => {
  it('joins statements and the return expression', () => {
    expect(buildIife('(int, string)', ['a := 1', 'b := ""'], 'a, b')).toBe('(func() (int, string) { a := 1; b := ""; return a, b })()');
    expect(buildIife('int', [], '1')).toBe('(func() int { return 1 })()');
  });
});

describe('parseQEvalResult', () => {
  it('returns nothing for empty or tuple-less output', () => {
    expect(parseQEvalResult('')).toEqual([]);
    expect(parseQEvalResult('no tuples here')).toEqual([]);
  });

  it('parses scalar tuples', () => {
    expect(parseQEvalResult('(true bool)\n(-12345 int64)')).toEqual([
      { value: 'true', type: 'bool' },
      { value: '-12345', type: 'int64' },
    ]);
  });

  it('keeps escaped quotes inside string values', () => {
    expect(parseQEvalResult('("a \\"b\\" (c)" string)')).toEqual([{ value: '"a \\"b\\" (c)"', type: 'string' }]);
  });

  it('parses nested parentheses in types', () => {
    expect(parseQEvalResult('(&errors.errorString{s:"x"} *errors.errorString)\n(nil func() (int))')).toEqual([
      { value: '&errors.errorString{s:"x"}', type: '*errors.errorString' },
      { value: 'nil', type: 'func() (int)' },
    ]);
  });

  it('parses bare values without a type', () => {
    expect(parseQEvalResult('(undefined)')).toEqual([{ value: 'undefined', type: '' }]);
    expect(parseQEvalResult('()')).toEqual([{ value: '', type: '' }]);
  });

  it('tolerates truncated output', () => {
    expect(parseQEvalResult('("unterminated')).toEqual([{ value: '"unterminated', type: '' }]);
    expect(parseQEvalResult('(5 int')).toEqual([{ value: '5', type: 'int' }]);
    expect(parseQEvalResult('("a\\')).toHaveLength(1);
  });
});

describe('decodeGoString', () => {
  it('returns non-literals unchanged', () => {
    expect(decodeGoString('123')).toBe('123');
    expect(decodeGoString('')).toBe('');
  });

  it('decodes simple, hex and unicode escapes', () => {
    expect(decodeGoString('"a\\nb\\rc\\td"')).toBe('a\nb\rc\td');
    expect(decodeGoString('"\\x41\\u00e9\\u0044"')).toBe('AéD');
    expect(decodeGoString('"\\"\\\\"')).toBe('"\\');
  });

  it('keeps the escaped character for unknown escapes', () => {
    expect(decodeGoString('"\\q\\/"')).toBe('q/');
  });

  it('decodes the empty literal', () => {
    expect(decodeGoString('""')).toBe('');
  });

  it('round-trips gnoLiteral', () => {
    const value = 'quote " slash \\ nl \n tab \t bell \x07 del \x7f 한글';

    expect(decodeGoString(gnoLiteral(value))).toBe(value);
  });
});
