import { boundedNumber, parseArgs, parseChatArgs } from '../cli';

const spec = { values: ['runs', 'out'], flags: ['verbose'] };

describe('parseArgs', () => {
  it('reads options with values and bare flags in any order', () => {
    const { values, flags } = parseArgs(['--verbose', '--runs', '5', '--out', 'r.json'], spec);

    expect([...values]).toEqual([
      ['runs', '5'],
      ['out', 'r.json'],
    ]);
    expect([...flags]).toEqual(['verbose']);
  });

  it.each([
    ['an unknown option', ['--nope', '1'], 'Unknown option: --nope'],
    ['an option without a value', ['--runs'], '--runs needs a value'],
    ['a stray positional argument', ['hello'], 'Unexpected argument: hello'],
  ])('rejects %s', (_label, argv, message) => {
    expect(() => parseArgs(argv, spec)).toThrow(message);
  });
});

describe('chat transaction preparation', () => {
  it('is disabled by default, including when the prompt asks to send', () => {
    expect(parseChatArgs(['--onbloc', '--prompt', 'Send 1 GNOT']).allowTransactionPreparation).toBe(false);
  });

  it('requires an explicit flag and an Onbloc session', () => {
    expect(parseChatArgs(['--onbloc', '--allow-transaction-preparation']).allowTransactionPreparation).toBe(true);
    expect(() => parseChatArgs(['--allow-transaction-preparation'])).toThrow(
      '--allow-transaction-preparation requires --onbloc.'
    );
  });
});

describe('boundedNumber', () => {
  const values = (text?: string) => new Map(text === undefined ? [] : [['n', text]]);

  it('returns the fallback when the option is absent', () => {
    expect(boundedNumber(values(), 'n', 7, 1, 10)).toBe(7);
  });

  it('accepts values at both bounds', () => {
    expect(boundedNumber(values('1'), 'n', 7, 1, 10)).toBe(1);
    expect(boundedNumber(values('10'), 'n', 7, 1, 10)).toBe(10);
  });

  it.each(['0', '11', '', ' ', 'abc', 'NaN', 'Infinity', '2.5'])('rejects %p as an integer in [1, 10]', (text) => {
    expect(() => boundedNumber(values(text), 'n', 7, 1, 10)).toThrow('--n must be an integer in [1, 10]');
  });

  it('allows fractions when integers are not required', () => {
    expect(boundedNumber(values('0.2'), 'n', 1, 0, 2, false)).toBe(0.2);
  });
});
