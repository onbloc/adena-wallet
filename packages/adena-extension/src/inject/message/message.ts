export type StatusType = 'request' | 'response' | 'common' | 'success' | 'failure';

const MESSAGE_TYPES = {
  ADD_ESTABLISH: {
    code: 0,
    description: 'Add Establish Site.',
  },
  DO_CONTRACT: {
    code: 0,
    description: 'Show contract popup.',
  },
  GET_ACCOUNT: {
    code: 0,
    description: 'Get account.',
  },
  SIGN_AMINO: {
    code: 0,
    description: 'Sign amino.',
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
  UNUSED_ACCOUNT: {
    code: 3000,
    description: 'The account has never been used.',
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
  CONNECTION_REJECTED: {
    code: 4000,
    description: 'The connection request has been rejected by the user.',
  },
  TRANSACTION_FAILED: {
    code: 4001,
    description: 'The transaction has failed.',
  },
  ALREADY_CONNECTED: {
    code: 4001,
    description: 'The account is already connected to this website.',
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
    description: 'Sign information has been successfully returned.',
  },
  TRANSACTION_SENT: {
    code: 0,
    description: 'The transaction has been successfully sent.',
  },
};

export type MessageKeyType = keyof typeof MESSAGE_TYPES;

export interface InjectionMessage {
  code: number;
  key?: string;
  hostname?: string;
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

  public get datas(): InjectionMessage {
    return {
      key: this.key,
      code: this.code,
      status: this.status,
      type: this.type,
      message: this.description,
      data: this.data,
    };
  }

  public getCode = () => {
    return this.code;
  };

  public getType = () => {
    return this.type;
  };

  public getStatus = () => {
    return this.status;
  };

  public getDescription = () => {
    return this.description;
  };

  public getData = () => {
    return this.data;
  };

  public static request = (
    messageKey: MessageKeyType,
    data?: { [key in string]: any },
    key?: string,
  ) => {
    return new InjectionMessageInstance(messageKey, 'request', data, key).datas;
  };

  public static response = (
    messageKey: MessageKeyType,
    data?: { [key in string]: any },
    key?: string,
  ) => {
    return new InjectionMessageInstance(messageKey, 'response', data, key).datas;
  };

  public static success = (
    messageKey: MessageKeyType,
    data?: { [key in string]: any },
    key?: string,
  ) => {
    return new InjectionMessageInstance(messageKey, 'success', data, key).datas;
  };

  public static failure = (
    messageKey: MessageKeyType,
    data?: { [key in string]: any },
    key?: string,
  ) => {
    return new InjectionMessageInstance(messageKey, 'failure', data, key).datas;
  };
}
