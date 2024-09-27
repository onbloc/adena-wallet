import { WalletMessageInfo, WalletResponseType } from '@adena-wallet/sdk';

export type StatusType = 'request' | 'response' | 'common' | 'success' | 'failure';

export interface InjectionMessage {
  code: number;
  key?: string;
  hostname?: string;
  protocol?: string;
  type: WalletResponseType;
  status: StatusType;
  message: string;
  data: { [key in string]: any } | undefined;
}

export class InjectionMessageInstance {
  private key: string;

  private code: number;

  private type: WalletResponseType;

  private status: StatusType;

  private description: string;

  private data: { [key in string]: any } | undefined;

  constructor(
    messageKey: WalletResponseType,
    status?: StatusType,
    data?: { [key in string]: any },
    key?: string,
  ) {
    const { code, message, type } = WalletMessageInfo[messageKey];
    this.key = key ?? '';
    this.code = code;
    this.type = type;
    this.status = status ?? 'common';
    this.description = message;
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

  public getType = (): WalletResponseType => {
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
    messageKey: WalletResponseType,
    data?: { [key in string]: any },
    key?: string,
  ): InjectionMessage => {
    return new InjectionMessageInstance(messageKey, 'request', data, key).dataObj;
  };

  public static response = (
    messageKey: WalletResponseType,
    data?: { [key in string]: any },
    key?: string,
  ): InjectionMessage => {
    return new InjectionMessageInstance(messageKey, 'response', data, key).dataObj;
  };

  public static success = (
    messageKey: WalletResponseType,
    data?: { [key in string]: any },
    key?: string,
  ): InjectionMessage => {
    return new InjectionMessageInstance(messageKey, 'success', data, key).dataObj;
  };

  public static failure = (
    messageKey: WalletResponseType,
    data?: { [key in string]: any },
    key?: string,
  ): InjectionMessage => {
    return new InjectionMessageInstance(messageKey, 'failure', data, key).dataObj;
  };
}
