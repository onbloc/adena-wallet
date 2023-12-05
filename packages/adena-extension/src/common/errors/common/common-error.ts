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
};

type ErrorType = keyof typeof ERROR_VALUE;

export class CommonError extends BaseError {
	constructor(errorType: ErrorType) {
		super(ERROR_VALUE[errorType]);
		Object.setPrototypeOf(this, CommonError.prototype);
	}
}
