export type StatusType = 'request' | 'response' | 'common' | 'success' | 'failure';

const MESSAGE_TYPES = {
  ADD_ESTABLISH: {
    code: 0,
    description: 'Establish Connection.',
  },
  CHECK_CONNECTION: {
    code: 0,
    description: 'Check Connection status',
  },
  DO_CONTRACT: {
    code: 0,
    description: 'Do Contract.',
  },
  GET_ACCOUNT: {
    code: 0,
    description: 'Get Account Information.',
  },
  SIGN_AMINO: {
    code: 0,
    description: 'Sign Amino',
  },
  SIGN_TX: {
    code: 0,
    description: 'Sign Transaction',
  },
  ADD_NETWORK: {
    code: 0,
    description: 'Add Network',
  },
  SWITCH_NETWORK: {
    code: 0,
    description: 'Switch Network',
  },
  NOT_CONNECTED: {
    code: 1000,
    description: 'A connection has not been established.',
  },
  UNRESOLVED_TRANSACTION_EXISTS: {
    code: 1001,
    description: 'An unresolved transaction pop-up exists.',
  },
  INVALID_FORMAT: {
    code: 1002,
    description: 'The transaction is in an invalid format.',
  },
  WALLET_LOCKED: {
    code: 2000,
    description: 'Adena is Locked.',
  },
  ACCOUNT_MISMATCH: {
    code: 3001,
    description: 'The account does not match the caller.',
  },
  NO_ACCOUNT: {
    code: 3002,
    description: 'No account found on Adena.',
  },
  TRANSACTION_REJECTED: {
    code: 4000,
    description: 'The transaction has been rejected by the user.',
  },
  SIGN_REJECTED: {
    code: 4000,
    description: 'The signature has been rejected by the user.',
  },
  CONNECTION_REJECTED: {
    code: 4000,
    description: 'The connection request has been rejected by the user.',
  },
  SWITCH_NETWORK_REJECTED: {
    code: 4000,
    description: 'Switching the network has been rejected by the user.',
  },
  ADD_NETWORK_REJECTED: {
    code: 4000,
    description: 'Adding a network has been rejected by the user.',
  },
  TRANSACTION_FAILED: {
    code: 4001,
    description: 'Adena could not execute the transaction.',
  },
  SIGN_FAILED: {
    code: 4001,
    description: 'Adena could not generate the signature hash.',
  },
  ALREADY_CONNECTED: {
    code: 4001,
    description: 'The account is already connected to this website.',
  },
  NETWORK_TIMEOUT: {
    code: 4001,
    description: 'The network response has timed out.',
  },
  REDUNDANT_CHANGE_REQUEST: {
    code: 4001,
    description: 'Unable to change to the current network.',
  },
  NETWORK_ALREADY_EXISTS: {
    code: 4001,
    description: 'The network already exists.',
  },
  UNADDED_NETWORK: {
    code: 4001,
    description: 'The network has not been added on Adena.',
  },
  UNSUPPORTED_TYPE: {
    code: 4005,
    description: 'Adena does not support the requested transaction type.',
  },
  UNEXPECTED_ERROR: {
    code: 9000,
    description: 'Adena has encountered an unexpected error.',
  },
  CONNECTION_SUCCESS: {
    code: 0,
    description: 'The connection has been successfully established.',
  },
  GET_ACCOUNT_SUCCESS: {
    code: 0,
    description: 'Account information has been successfully returned.',
  },
  SIGN_SUCCESS: {
    code: 0,
    description: 'Signature hash has been successfully generated.',
  },
  ADD_NETWORK_SUCCESS: {
    code: 0,
    description: 'The network has been successfully added.',
  },
  SWITCH_NETWORK_SUCCESS: {
    code: 0,
    description: 'The network has been successfully changed.',
  },
  TRANSACTION_SUCCESS: {
    code: 0,
    description: 'Transaction has been successfully executed.',
  },
};

export type MessageKeyType = keyof typeof MESSAGE_TYPES;

export interface InjectionMessage {
  code: number;
  key?: string;
  hostname?: string;
  protocol?: string;
  type: MessageKeyType;
  status: StatusType;
  message: string;
  data: { [key in string]: any } | undefined;
}

export class InjectionMessageInstance {
  private key: string;

  private code: number;

  private type: MessageKeyType;

  private status: StatusType;

  private description: string;

  private data: { [key in string]: any } | undefined;

  constructor(
    messageKey: MessageKeyType,
    status?: StatusType,
    data?: { [key in string]: any },
    key?: string,
  ) {
    const { code, description } = MESSAGE_TYPES[messageKey];
    this.key = key ?? '';
    this.code = code;
    this.type = messageKey;
    this.status = status ?? 'common';
    this.description = description;
    this.data = data;
  }

  public get dataObj(): InjectionMessage {
    return {
      key: this.key,
      code: this.code,
      status: this.status,
      type: this.type,
      message: this.description,
      data: this.data,
    };
  }

  public getCode = (): number => {
    return this.code;
  };

  public getType = ():
    | 'ADD_ESTABLISH'
    | 'CHECK_CONNECTION'
    | 'DO_CONTRACT'
    | 'GET_ACCOUNT'
    | 'SIGN_AMINO'
    | 'SIGN_TX'
    | 'ADD_NETWORK'
    | 'SWITCH_NETWORK'
    | 'NOT_CONNECTED'
    | 'UNRESOLVED_TRANSACTION_EXISTS'
    | 'INVALID_FORMAT'
    | 'WALLET_LOCKED'
    | 'ACCOUNT_MISMATCH'
    | 'NO_ACCOUNT'
    | 'TRANSACTION_REJECTED'
    | 'SIGN_REJECTED'
    | 'CONNECTION_REJECTED'
    | 'SWITCH_NETWORK_REJECTED'
    | 'ADD_NETWORK_REJECTED'
    | 'TRANSACTION_FAILED'
    | 'SIGN_FAILED'
    | 'ALREADY_CONNECTED'
    | 'NETWORK_TIMEOUT'
    | 'REDUNDANT_CHANGE_REQUEST'
    | 'NETWORK_ALREADY_EXISTS'
    | 'UNADDED_NETWORK'
    | 'UNSUPPORTED_TYPE'
    | 'UNEXPECTED_ERROR'
    | 'CONNECTION_SUCCESS'
    | 'GET_ACCOUNT_SUCCESS'
    | 'SIGN_SUCCESS'
    | 'ADD_NETWORK_SUCCESS'
    | 'SWITCH_NETWORK_SUCCESS'
    | 'TRANSACTION_SUCCESS' => {
    return this.type;
  };

  public getStatus = (): StatusType => {
    return this.status;
  };

  public getDescription = (): string => {
    return this.description;
  };

  public getData = (): { [x: string]: any } | undefined => {
    return this.data;
  };

  public static request = (
    messageKey: MessageKeyType,
    data?: { [key in string]: any },
    key?: string,
  ): InjectionMessage => {
    return new InjectionMessageInstance(messageKey, 'request', data, key).dataObj;
  };

  public static response = (
    messageKey: MessageKeyType,
    data?: { [key in string]: any },
    key?: string,
  ): InjectionMessage => {
    return new InjectionMessageInstance(messageKey, 'response', data, key).dataObj;
  };

  public static success = (
    messageKey: MessageKeyType,
    data?: { [key in string]: any },
    key?: string,
  ): InjectionMessage => {
    return new InjectionMessageInstance(messageKey, 'success', data, key).dataObj;
  };

  public static failure = (
    messageKey: MessageKeyType,
    data?: { [key in string]: any },
    key?: string,
  ): InjectionMessage => {
    return new InjectionMessageInstance(messageKey, 'failure', data, key).dataObj;
  };
}
