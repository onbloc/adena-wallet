import { WalletMessageInfo, WalletResponseType } from '@adena-wallet/sdk';
import { TxSignature } from '@gnolang/tm2-js-client';

export type StatusType = 'request' | 'response' | 'common' | 'success' | 'failure';

export interface InjectionMessage {
  code: number;
  key?: string;
  hostname?: string;
  protocol?: string;
  withNotification?: boolean;
  type: WalletResponseType;
  status: StatusType;
  message: string;
  data: { [key in string]: any } | undefined;
}

export interface InjectionMessageWithSignature extends InjectionMessage {
  signature?: TxSignature[];
}

export class InjectionMessageInstance {
  private key: string;

  private code: number;

  private type: WalletResponseType;

  private status: StatusType;

  private description: string;

  private withNotification: boolean;

  private data: { [key in string]: any } | undefined;

  constructor(
    messageKey: WalletResponseType,
    status?: StatusType,
    data?: { [key in string]: any },
    key?: string,
    withNotification?: boolean,
  ) {
    console.log(
      WalletMessageInfo[messageKey],
      WalletMessageInfo,
      messageKey,
      'WalletMessageInfo[messageKey]',
    );
    const { code, message, type } = WalletMessageInfo[messageKey];
    this.key = key ?? '';
    this.code = code || 0;
    this.type = type;
    this.status = status ?? 'common';
    this.description = message;
    this.data = data;
    this.withNotification = withNotification ?? true;
  }

  public get dataObj(): InjectionMessage {
    return {
      key: this.key,
      code: this.code,
      status: this.status,
      type: this.type,
      message: this.description,
      data: this.data,
      withNotification: this.withNotification,
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

  public getWithNotification = (): boolean => {
    return this.withNotification;
  };

  public setWithNotification = (withNotification: boolean): void => {
    this.withNotification = withNotification;
  };

  public static request = (
    messageKey: WalletResponseType,
    data?: { [key in string]: any },
    key?: string,
    withNotification?: boolean,
  ): InjectionMessage => {
    console.log('시작 4!', messageKey, data, key);
    return new InjectionMessageInstance(messageKey, 'request', data, key, withNotification).dataObj;
  };

  public static response = (
    messageKey: WalletResponseType,
    data?: { [key in string]: any },
    key?: string,
    withNotification?: boolean,
  ): InjectionMessage => {
    return new InjectionMessageInstance(messageKey, 'response', data, key, withNotification)
      .dataObj;
  };

  public static success = (
    messageKey: WalletResponseType,
    data?: { [key in string]: any },
    key?: string,
    withNotification?: boolean,
  ): InjectionMessage => {
    return new InjectionMessageInstance(messageKey, 'success', data, key, withNotification).dataObj;
  };

  public static failure = (
    messageKey: WalletResponseType,
    data?: { [key in string]: any },
    key?: string,
    withNotification?: boolean,
  ): InjectionMessage => {
    return new InjectionMessageInstance(messageKey, 'failure', data, key, withNotification).dataObj;
  };
}
