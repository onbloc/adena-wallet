import { BaseError } from '../base';

const ERROR_VALUE = {
  MEMO_TOO_LARGE_ERROR: {
    status: 1000,
    type: 'MEMO_TOO_LARGE_ERROR',
    message: 'Memo too large',
  },
  INSUFFICIENT_NETWORK_FEE: {
    status: 1001,
    type: 'INSUFFICIENT_NETWORK_FEE',
    message: 'Insufficient network fee',
  },
};

type ErrorType = keyof typeof ERROR_VALUE;

export class TransactionValidationError extends BaseError {
  constructor(errorType: ErrorType) {
    super(ERROR_VALUE[errorType]);
    Object.setPrototypeOf(this, TransactionValidationError.prototype);
  }
}
