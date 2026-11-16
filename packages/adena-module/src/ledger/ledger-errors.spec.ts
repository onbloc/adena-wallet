import { LedgerError, classifyLedgerError } from './ledger-errors';

describe('LedgerError', () => {
  it('sets kind, message, name, and prototype', () => {
    const err = new LedgerError('DeviceLocked', 'locked');

    expect(err).toBeInstanceOf(LedgerError);
    expect(err).toBeInstanceOf(Error);
    expect(err.kind).toBe('DeviceLocked');
    expect(err.message).toBe('locked');
    expect(err.name).toBe('LedgerError');
  });

  it('preserves the original cause', () => {
    const original = new Error('boom');
    const err = new LedgerError('Unknown', 'wrapped', original);

    expect(err.cause).toBe(original);
  });
});

describe('classifyLedgerError', () => {
  it('returns the input unchanged when already a LedgerError', () => {
    const original = new LedgerError('UserRejected', 'nope');

    expect(classifyLedgerError(original)).toBe(original);
  });

  it.each<[string, number, LedgerError['kind']]>([
    ['device locked (0x5515)', 0x5515, 'DeviceLocked'],
    ['device locked (0x6b0c)', 0x6b0c, 'DeviceLocked'],
    ['app not open (0x6511)', 0x6511, 'AppNotOpen'],
    ['app not open (0x6e00)', 0x6e00, 'AppNotOpen'],
    ['app not open (0x6e01)', 0x6e01, 'AppNotOpen'],
    ['user rejected (0x6985)', 0x6985, 'UserRejected'],
    ['user rejected (0x6986)', 0x6986, 'UserRejected'],
    ['timeout (0x6804)', 0x6804, 'Timeout'],
  ])('maps %s to %s via return_code', (_label, statusCode, expectedKind) => {
    const result = classifyLedgerError({
      return_code: statusCode,
      error_message: 'some device message',
    });

    expect(result).toBeInstanceOf(LedgerError);
    expect(result.kind).toBe(expectedKind);
    expect(result.message).toBe('some device message');
  });

  it('reads status from alternative keys (statusCode)', () => {
    const result = classifyLedgerError({ statusCode: 0x6985, message: 'denied' });

    expect(result.kind).toBe('UserRejected');
  });

  it('falls back to DeviceLocked when message mentions a locked device', () => {
    const result = classifyLedgerError(new Error('Ledger device is locked'));

    expect(result.kind).toBe('DeviceLocked');
  });

  it('falls back to AppNotOpen when message mentions opening the app', () => {
    const result = classifyLedgerError(
      new Error('App does not seem to be open, please open the Cosmos app'),
    );

    expect(result.kind).toBe('AppNotOpen');
  });

  it('falls back to UserRejected when message mentions transaction rejection', () => {
    const result = classifyLedgerError(new Error('Transaction rejected by user'));

    expect(result.kind).toBe('UserRejected');
  });

  it('falls back to Timeout when message mentions timing out', () => {
    const result = classifyLedgerError(new Error('request timed out'));

    expect(result.kind).toBe('Timeout');
  });

  it('falls back to TransportFailed when transport disconnects', () => {
    const result = classifyLedgerError(new Error('Transport was disconnected'));

    expect(result.kind).toBe('TransportFailed');
  });

  it('returns Unknown for unrecognized errors and preserves the cause', () => {
    const cause = { weird: true };
    const result = classifyLedgerError(cause);

    expect(result.kind).toBe('Unknown');
    expect(result.message).toBe('Unknown Ledger error');
    expect(result.cause).toBe(cause);
  });

  it('prefers status mapping over message heuristics', () => {
    const result = classifyLedgerError({
      return_code: 0x6985,
      error_message: 'Transport was disconnected',
    });

    expect(result.kind).toBe('UserRejected');
  });
});
