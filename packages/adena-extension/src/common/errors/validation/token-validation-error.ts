import { BaseError } from '../base';

const ERROR_VALUE = {
  INVALID_REALM_PATH: {
    status: 4000,
    type: 'INVALID_REALM_PATH',
    message: 'Invalid realm path',
  },
  ALREADY_ADDED: {
    status: 4000,
    type: 'ALREADY_ADDED',
    message: 'Already added',
  },
};

type ErrorType = keyof typeof ERROR_VALUE;

export class TokenValidationError extends BaseError {
  constructor(errorType: ErrorType) {
    super(ERROR_VALUE[errorType]);
    Object.setPrototypeOf(this, TokenValidationError.prototype);
  }
}
