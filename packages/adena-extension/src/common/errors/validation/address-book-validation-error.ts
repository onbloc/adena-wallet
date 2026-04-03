import { BaseError } from '../base';

const ERROR_VALUE = {
  INVALID_ADDRESS: {
    status: 1000,
    type: 'INVALID_ADDRESS',
    message: 'Invalid address',
  },
  ALREADY_ADDRESS: {
    status: 1001,
    type: 'ALREADY_ADDRESS',
    message: 'Address already registered',
  },
  ALREADY_NAME: {
    status: 1002,
    type: 'ALREADY_NAME',
    message: 'Name already in use',
  },
};

type ErrorType = keyof typeof ERROR_VALUE;

export class AddressBookValidationError extends BaseError {
  constructor(errorType: ErrorType) {
    super(ERROR_VALUE[errorType]);
    Object.setPrototypeOf(this, AddressBookValidationError.prototype);
  }
}
