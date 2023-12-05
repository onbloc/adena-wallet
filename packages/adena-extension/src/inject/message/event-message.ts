import { EventKeyType } from '@common/constants/event-key.constant';

type StatusType = 'event';

interface Message {
  code: number;
  description: string;
}

const MESSAGE_TYPES: { [key in EventKeyType]: Message } = {
  changedAccount: {
    code: 0,
    description: 'Account has been successfully changed.',
  },
  changedNetwork: {
    code: 0,
    description: 'Netwrok has been successfully changed.',
  },
};

export interface EventMessageData {
  code: number;
  key?: string;
  hostname?: string;
  protocol?: string;
  type: EventKeyType;
  status: StatusType;
  message: string;
  data: any;
}

export class EventMessage {
  private key: string;

  private code: number;

  private type: EventKeyType;

  private status: StatusType;

  private description: string;

  private data: any;

  constructor(messageKey: EventKeyType, status?: StatusType, data?: any, key?: string) {
    const { code, description } = MESSAGE_TYPES[messageKey];
    this.key = key ?? '';
    this.code = code;
    this.type = messageKey;
    this.status = status ?? 'event';
    this.description = description;
    this.data = data;
  }

  public get message(): EventMessageData {
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

  public getType = (): 'changedAccount' | 'changedNetwork' => {
    return this.type;
  };

  public getStatus = (): 'event' => {
    return this.status;
  };

  public getDescription = (): string => {
    return this.description;
  };

  public getData = (): any => {
    return this.data;
  };

  public static event = (messageKey: EventKeyType, data?: any): EventMessageData => {
    return new EventMessage(messageKey, 'event', data).message;
  };
}
