export type LedgerErrorKind =
  | 'DeviceLocked'
  | 'AppNotOpen'
  | 'UserRejected'
  | 'Timeout'
  | 'TransportFailed'
  | 'Unknown';

export class LedgerError extends Error {
  public readonly kind: LedgerErrorKind;
  public readonly cause?: unknown;

  constructor(kind: LedgerErrorKind, message: string, cause?: unknown) {
    super(message);
    this.name = 'LedgerError';
    this.kind = kind;
    this.cause = cause;
    Object.setPrototypeOf(this, LedgerError.prototype);
  }
}

// Ledger / BOLOS status words used by ledger-cosmos-js and @cosmjs/ledger-amino.
// Reference: https://developers.ledger.com/docs/device-app/develop/references/status-words
const STATUS_TO_KIND: Record<number, LedgerErrorKind> = {
  0x5515: 'DeviceLocked',
  0x6b0c: 'DeviceLocked',
  0x6511: 'AppNotOpen',
  0x6e00: 'AppNotOpen',
  0x6e01: 'AppNotOpen',
  0x6985: 'UserRejected',
  0x6986: 'UserRejected',
  0x6804: 'Timeout',
};

function coerceNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function extractStatus(err: unknown): number | undefined {
  if (err === null || typeof err !== 'object') {
    return undefined;
  }
  const record = err as Record<string, unknown>;
  return (
    coerceNumber(record.return_code) ??
    coerceNumber(record.returnCode) ??
    coerceNumber(record.statusCode) ??
    coerceNumber(record.status)
  );
}

function extractMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === 'string') {
    return err;
  }
  if (err !== null && typeof err === 'object') {
    const record = err as Record<string, unknown>;
    const candidate = record.error_message ?? record.message;
    if (typeof candidate === 'string') {
      return candidate;
    }
  }
  return 'Unknown Ledger error';
}

export function classifyLedgerError(err: unknown): LedgerError {
  if (err instanceof LedgerError) {
    return err;
  }

  const status = extractStatus(err);
  const message = extractMessage(err);

  if (status !== undefined && STATUS_TO_KIND[status]) {
    return new LedgerError(STATUS_TO_KIND[status], message, err);
  }

  const lower = message.toLowerCase();

  if (
    lower.includes('locked device') ||
    lower.includes('device is locked') ||
    lower.includes('device locked')
  ) {
    return new LedgerError('DeviceLocked', message, err);
  }

  if (
    lower.includes('app does not seem to be open') ||
    lower.includes('application is not open') ||
    lower.includes('please open the') ||
    lower.includes('open the cosmos app')
  ) {
    return new LedgerError('AppNotOpen', message, err);
  }

  if (
    lower.includes('transaction rejected') ||
    lower.includes('denied by the user') ||
    lower.includes('user rejected') ||
    lower.includes('rejected by user')
  ) {
    return new LedgerError('UserRejected', message, err);
  }

  if (lower.includes('timeout') || lower.includes('timed out')) {
    return new LedgerError('Timeout', message, err);
  }

  if (
    lower.includes('disconnect') ||
    lower.includes('transport') ||
    lower.includes('no device selected') ||
    lower.includes('cannot open device') ||
    lower.includes('device not found')
  ) {
    return new LedgerError('TransportFailed', message, err);
  }

  return new LedgerError('Unknown', message, err);
}
