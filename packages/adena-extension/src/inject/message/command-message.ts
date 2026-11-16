import { CommandKeyType } from '@common/constants/command-key.constant';
import { GnoConnectInfo, GnoMessageInfo } from './methods/gno-connect';
type StatusType = 'command';

export function isCommandMessageData(data: any): data is CommandMessageData {
  return data.status === 'command';
}

export interface CommandMessageData<T = any> {
  key: string;
  code: number;
  status: StatusType;
  command: CommandKeyType;
  data: T;
}

export interface CheckMetadataMessageData {
  gnoMessageInfo: GnoMessageInfo | null;
  gnoConnectInfo: GnoConnectInfo | null;
}

export class CommandMessage {
  private code: number;

  private key: string;

  private status: StatusType;

  private command: CommandKeyType;

  private data: any;

  constructor(command: CommandKeyType, data?: any, key?: string) {
    this.code = 0;
    this.key = key ?? '';
    this.command = command;
    this.status = 'command';
    this.data = data;
  }

  public get message(): CommandMessageData {
    return {
      code: this.code,
      key: this.key,
      status: this.status,
      command: this.command,
      data: this.data,
    };
  }

  public getCommand = (): CommandKeyType => {
    return this.command;
  };

  public getStatus = (): 'command' => {
    return this.status;
  };

  public getData = (): any => {
    return this.data;
  };

  public static command = (command: CommandKeyType, data?: any): CommandMessageData => {
    return new CommandMessage(command, data).message;
  };
}
