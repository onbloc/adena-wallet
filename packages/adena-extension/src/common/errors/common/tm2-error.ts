import { BaseError } from '../base';

interface ErrorValueType {
  status: number;
  type: string;
  message: string;
}

const ERROR_VALUE: { [key in string]: ErrorValueType } = {
  INTERNAL_ERROR: {
    status: 400,
    type: '/std.InternalError',
    message: 'internal error',
  },
  TX_DECODE_ERROR: {
    status: 400,
    type: '/std.TxDecodeError',
    message: 'tx decode error',
  },
  INVALID_SEQUENCE_ERROR: {
    status: 400,
    type: '/std.InvalidSequenceError',
    message: 'invalid sequence error',
  },
  UNAUTHORIZED_ERROR: {
    status: 400,
    type: '/std.UnauthorizedError',
    message: 'unauthorized error',
  },
  INSUFFICIENT_FUNDS_ERROR: {
    status: 400,
    type: '/std.InsufficientFundsError',
    message: 'insufficient funds error',
  },
  UNKNOWN_REQUEST_ERROR: {
    status: 400,
    type: '/std.UnknownRequestError',
    message: 'unknown request error',
  },
  INVALID_ADDRESS_ERROR: {
    status: 400,
    type: '/std.InvalidAddressError',
    message: 'invalid address error',
  },
  UNKNOWN_ADDRESS_ERROR: {
    status: 400,
    type: '/std.UnknownAddressError',
    message: 'unknown address error',
  },
  INVALID_PUB_KEY_ERROR: {
    status: 400,
    type: '/std.InvalidPubKeyError',
    message: 'invalid pubkey error',
  },
  INSUFFICIENT_COINS_ERROR: {
    status: 400,
    type: '/std.InsufficientCoinsError',
    message: 'insufficient coins error',
  },
  INVALID_COINS_ERROR: {
    status: 400,
    type: '/std.InvalidCoinsError',
    message: 'invalid coins error',
  },
  INVALID_GAS_WANTED_ERROR: {
    status: 400,
    type: '/std.InvalidGasWantedError',
    message: 'invalid gas wanted',
  },
  OUT_OF_GAS_ERROR: {
    status: 400,
    type: '/std.OutOfGasError',
    message: 'out of gas error',
  },
  MEMO_TOO_LARGE_ERROR: {
    status: 400,
    type: '/std.MemoTooLargeError',
    message: 'memo too large error',
  },
  INSUFFICIENT_FEE_ERROR: {
    status: 400,
    type: '/std.InsufficientFeeError',
    message: 'insufficient fee error',
  },
  TOO_MANY_SIGNATURES_ERROR: {
    status: 400,
    type: '/std.TooManySignaturesError',
    message: 'too many signatures error',
  },
  NO_SIGNATURES_ERROR: {
    status: 400,
    type: '/std.NoSignaturesError',
    message: 'no signatures error',
  },
  GAS_OVERFLOW_ERROR: {
    status: 400,
    type: '/std.GasOverflowError',
    message: 'gas overflow error',
  },
  UNKNOWN_ERROR: {
    status: 400,
    type: 'UNKNOWN_ERROR',
    message: 'unknown error',
  },
};

type ErrorType = keyof typeof ERROR_VALUE;

export class Tm2Error extends BaseError {
  private hash: string | null;

  constructor(hash: string | null, errorType: ErrorType) {
    super(ERROR_VALUE[errorType]);
    Object.setPrototypeOf(this, Tm2Error.prototype);
    this.hash = hash;
  }

  get response(): { error: { type: string; message: string } } {
    return {
      error: {
        type: this.getType(),
        message: this.message,
      },
    };
  }

  public static createTm2Error(hash: string | null, message: string): Tm2Error {
    const errorType =
      Object.keys(ERROR_VALUE).find((key) => ERROR_VALUE[key].type === message) || 'UNKNOWN_ERROR';
    return new Tm2Error(hash, errorType);
  }
}
