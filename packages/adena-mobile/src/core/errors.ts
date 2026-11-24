export const AppErrorCode = {
  WALLET_NOT_FOUND: 'WALLET_NOT_FOUND',
  WALLET_ALREADY_EXISTS: 'WALLET_ALREADY_EXISTS',
  WALLET_LOCKED: 'WALLET_LOCKED',
  INVALID_PASSWORD: 'INVALID_PASSWORD',
  WEAK_PASSWORD: 'WEAK_PASSWORD',
  PASSWORD_ATTEMPTS_EXCEEDED: 'PASSWORD_ATTEMPTS_EXCEEDED',
  INVALID_MNEMONIC: 'INVALID_MNEMONIC',
  INVALID_ADDRESS: 'INVALID_ADDRESS',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  BIOMETRICS_UNAVAILABLE: 'BIOMETRICS_UNAVAILABLE',
  BIOMETRICS_CANCELED: 'BIOMETRICS_CANCELED',
  NETWORK_MISMATCH: 'NETWORK_MISMATCH',
  NETWORK_ERROR: 'NETWORK_ERROR',
  INVALID_REQUEST: 'INVALID_REQUEST',
  UNSUPPORTED_MESSAGE: 'UNSUPPORTED_MESSAGE',
  REQUEST_EXPIRED: 'REQUEST_EXPIRED',
  USER_REJECTED: 'USER_REJECTED',
  NOT_CONNECTED: 'NOT_CONNECTED',
  STORAGE_ERROR: 'STORAGE_ERROR',
  STORAGE_UNREADABLE: 'STORAGE_UNREADABLE',
  CRYPTO_UNAVAILABLE: 'CRYPTO_UNAVAILABLE',
  MIGRATION_FAILED: 'MIGRATION_FAILED',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
} as const;

export type AppErrorCode = (typeof AppErrorCode)[keyof typeof AppErrorCode];

export class AppError extends Error {
  readonly code: AppErrorCode;

  constructor(code: AppErrorCode, message?: string, options?: { cause?: unknown }) {
    super(message ?? code);
    this.name = 'AppError';
    this.code = code;

    if (options?.cause !== undefined) {
      (this as { cause?: unknown }).cause = options.cause;
    }
  }
}

export const isAppError = (error: unknown, code?: AppErrorCode): error is AppError =>
  error instanceof AppError && (code === undefined || error.code === code);
