import { EMessageType } from '@inject/types';
import { mappedTransactionMessages } from './transaction-mapper';

describe('mappedTransactionMessages', () => {
  it('keeps session admin messages', () => {
    const messages = mappedTransactionMessages([
      {
        type: EMessageType.AUTH_CREATE_SESSION,
        value: {
          creator: 'g1creator',
          spend_limit: '3000000ugnot',
        },
      },
      {
        type: EMessageType.AUTH_REVOKE_SESSION,
        value: {
          creator: 'g1creator',
        },
      },
      {
        type: EMessageType.AUTH_REVOKE_ALL_SESSIONS,
        value: {
          creator: 'g1creator',
        },
      },
    ]);

    expect(messages.map((message) => message.type)).toEqual([
      EMessageType.AUTH_CREATE_SESSION,
      EMessageType.AUTH_REVOKE_SESSION,
      EMessageType.AUTH_REVOKE_ALL_SESSIONS,
    ]);
  });
});
