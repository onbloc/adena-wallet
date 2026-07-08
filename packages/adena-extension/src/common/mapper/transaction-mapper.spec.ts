import { EMessageType } from '@inject/types';
import {
  mappedDocumentMessagesWithCaller,
  mappedTransactionMessages,
} from './transaction-mapper';

describe('mappedDocumentMessagesWithCaller', () => {
  it('maps supported messages and injects the caller/from_address', () => {
    const result = mappedDocumentMessagesWithCaller(
      [{ type: '/bank.MsgSend', value: { amount: '1ugnot' } }],
      'g1master',
    );
    expect(result).toEqual([
      { type: '/bank.MsgSend', value: { amount: '1ugnot', from_address: 'g1master' } },
    ]);
  });

  it('throws instead of silently dropping unsupported message types', () => {
    // Dropping would sign a smaller tx than the dApp requested. /bank.MsgMultiSend
    // has no proto encoder, so it must fail closed here.
    expect(() =>
      mappedDocumentMessagesWithCaller(
        [
          { type: '/bank.MsgSend', value: {} },
          { type: '/bank.MsgMultiSend', value: {} },
        ],
        'g1master',
      ),
    ).toThrow(/Unsupported transaction message type/);
  });
});

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
