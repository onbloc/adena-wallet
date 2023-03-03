import { BaseError } from '../base';

const ERROR_VALUE = {
  NOT_FOUND_SERIALIZED: {
    status: 1000,
    type: 'NOT_FOUND_SERIALIZED',
  },
  NOT_FOUND_PASSWORD: {
    status: 1001,
    type: 'NOT_FOUND_PASSWORD',
  },
  FAILED_TO_LOAD: {
    status: 1002,
    type: 'FAILED_TO_LOAD',
  },
  FAILED_TO_CREATE: {
    status: 1003,
    type: 'FAILED_TO_CREATE',
  },
  NOT_FOUND_ACCOUNT: {
    status: 1004,
    type: 'NOT_FOUND_ACCOUNT',
  },
};

type ErrorType = keyof typeof ERROR_VALUE;

export class WalletError extends BaseError {
  constructor(errorType: ErrorType) {
    super(ERROR_VALUE[errorType]);
    Object.setPrototypeOf(this, WalletError.prototype);
  }
}
