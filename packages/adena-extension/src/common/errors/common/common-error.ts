import { BaseError } from '../base';

const ERROR_VALUE = {
  FAILED_INITIALIZE_PROVIDER: {
    status: 400,
    type: 'FAILED_TO_INITIALIZE_PROVIDER',
  },
  NOT_FOUND_NETWORKS: {
    status: 400,
    type: 'NOT_FOUND_NETWORKS',
  },
  FAILED_TO_RUN: {
    status: 400,
    type: 'FAILED_TO_RUN',
  },
  FAILED_INITIALIZE_CHROME_API: {
    status: 401,
    type: 'FAILED_INITIALIZE_CHROME_API',
  },
};

type ErrorType = keyof typeof ERROR_VALUE;

export class CommonError extends BaseError {
  constructor(errorType: ErrorType) {
    super(ERROR_VALUE[errorType]);
    Object.setPrototypeOf(this, CommonError.prototype);
  }
}
