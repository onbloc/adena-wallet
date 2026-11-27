export const AppErrorCode = {
  WALLET_NOT_FOUND: 'WALLET_NOT_FOUND',
  WALLET_ALREADY_EXISTS: 'WALLET_ALREADY_EXISTS',
  WALLET_LOCKED: 'WALLET_LOCKED',
  RESET_INCOMPLETE: 'RESET_INCOMPLETE',
  INVALID_PASSWORD: 'INVALID_PASSWORD',
  WEAK_PASSWORD: 'WEAK_PASSWORD',
  PASSWORD_ATTEMPTS_EXCEEDED: 'PASSWORD_ATTEMPTS_EXCEEDED',
  INVALID_MNEMONIC: 'INVALID_MNEMONIC',
  INVALID_ADDRESS: 'INVALID_ADDRESS',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  BIOMETRICS_UNAVAILABLE: 'BIOMETRICS_UNAVAILABLE',
  BIOMETRICS_CANCELED: 'BIOMETRICS_CANCELED',
  BIOMETRICS_INVALIDATED: 'BIOMETRICS_INVALIDATED',
  NETWORK_MISMATCH: 'NETWORK_MISMATCH',
  NETWORK_ERROR: 'NETWORK_ERROR',
  INVALID_REQUEST: 'INVALID_REQUEST',
  UNSUPPORTED_MESSAGE: 'UNSUPPORTED_MESSAGE',
  REQUEST_EXPIRED: 'REQUEST_EXPIRED',
  DUPLICATE_REQUEST: 'DUPLICATE_REQUEST',
  REQUEST_IN_PROGRESS: 'REQUEST_IN_PROGRESS',
  UNEXPECTED_ERROR: 'UNEXPECTED_ERROR',
  USER_REJECTED: 'USER_REJECTED',
  NOT_CONNECTED: 'NOT_CONNECTED',
  STORAGE_ERROR: 'STORAGE_ERROR',
  STORAGE_UNREADABLE: 'STORAGE_UNREADABLE',
  CRYPTO_UNAVAILABLE: 'CRYPTO_UNAVAILABLE',
  MIGRATION_FAILED: 'MIGRATION_FAILED',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
  TRANSACTION_PENDING: 'TRANSACTION_PENDING',
  PREVIOUS_TRANSACTION_PENDING: 'PREVIOUS_TRANSACTION_PENDING',
  UNSUPPORTED_NETWORK: 'UNSUPPORTED_NETWORK',
  SWAP_NO_ROUTE: 'SWAP_NO_ROUTE',
  SWAP_QUOTE_FAILED: 'SWAP_QUOTE_FAILED',
  SWAP_PRICE_MOVED: 'SWAP_PRICE_MOVED',
  SWAP_INVALID_TOKEN: 'SWAP_INVALID_TOKEN',
  CLOUD_BACKUP_UNAVAILABLE: 'CLOUD_BACKUP_UNAVAILABLE',
  CLOUD_BACKUP_NOT_SIGNED_IN: 'CLOUD_BACKUP_NOT_SIGNED_IN',
  CLOUD_BACKUP_QUOTA: 'CLOUD_BACKUP_QUOTA',
  BACKUP_NOT_FOUND: 'BACKUP_NOT_FOUND',
  BACKUP_CORRUPTED: 'BACKUP_CORRUPTED',
  BACKUP_UNSUPPORTED_VERSION: 'BACKUP_UNSUPPORTED_VERSION',
  BACKUP_CONFLICT: 'BACKUP_CONFLICT',
  AI_NOT_CONFIGURED: 'AI_NOT_CONFIGURED',
} as const;

export const BIOMETRICS_INVALIDATED_MESSAGE
  = 'Biometrics changed on this device. Unlock with your password and turn biometric unlock on again from Change password.';

// A replacement send found the pinned sequence no longer current on chain.
export const PINNED_SEQUENCE_MISMATCH_MESSAGE = 'The previous transaction changed state. Reopen this screen to check it again.';

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

// The broadcast outcome is unknown (timeout, network error): the tx may still commit, so it must not be re-sent blindly.
export class TransactionPendingError extends AppError {
  constructor(readonly hash: string, message = 'The transaction was sent but not confirmed yet', options?: { cause?: unknown }) {
    super(AppErrorCode.TRANSACTION_PENDING, message, options);
  }
}
