import { BaseError } from '../base';

const ERROR_VALUE = {
  EMPTY_PASSWORD: {
    status: 1000,
    type: 'EMPTY_PASSWORD',
    message: 'Password is empty',
  },
  WRONG_PASSWORD_LENGTH: {
    status: 1001,
    type: 'WRONG_PASSWORD_LENGTH',
    message: 'Password must be 8~23 characters',
  },
  INVALID_PASSWORD: {
    status: 1002,
    type: 'INVALID_PASSWORD',
    message: 'Invalid password',
  },
  EQUAL_CHANGE_PASSWORD: {
    status: 1002,
    type: 'EQUAL_CHANGE_PASSWORD',
    message: 'You can’t use your current password',
  },
  NOT_MATCH_CONFIRM_PASSWORD: {
    status: 1003,
    type: 'NOT_MATCH_CONFIRM_PASSWORD',
    message: 'Passwords do not match',
  },
};

type ErrorType = keyof typeof ERROR_VALUE;

export class PasswordValidationError extends BaseError {
  constructor(errorType: ErrorType) {
    super(ERROR_VALUE[errorType]);
    Object.setPrototypeOf(this, PasswordValidationError.prototype);
  }
}
