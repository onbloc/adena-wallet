import { MsgSend } from 'cosmjs-types/cosmos/bank/v1beta1/tx';

import {
  MSG_SEND_AMINO_TYPE,
  MSG_SEND_TYPE_URL,
  msgSendFromAmino,
  msgSendToAmino,
  msgSendToAny,
} from './msg-send';

describe('MsgSend codec', () => {
  const aminoMsg = {
    type: MSG_SEND_AMINO_TYPE,
    value: {
      from_address: 'atone1qqqsyqcyq5rqwzqfpg9scrgwpugpzysndkda8p',
      to_address: 'atone1qyqszqgpqyqszqgpqyqszqgpqyqszqgpwc2vge',
      amount: [{ denom: 'uphoton', amount: '1000' }],
    },
  };

  it('round-trips amino ↔ proto', () => {
    const proto = msgSendFromAmino(aminoMsg);
    expect(proto.fromAddress).toBe(aminoMsg.value.from_address);
    expect(proto.toAddress).toBe(aminoMsg.value.to_address);
    expect(proto.amount).toEqual(aminoMsg.value.amount);

    expect(msgSendToAmino(proto)).toEqual(aminoMsg);
  });

  it('toAny produces the correct typeUrl and decodable value', () => {
    const proto = msgSendFromAmino(aminoMsg);
    const any = msgSendToAny(proto);

    expect(any.typeUrl).toBe(MSG_SEND_TYPE_URL);
    expect(any.typeUrl).toBe('/cosmos.bank.v1beta1.MsgSend');

    const decoded = MsgSend.decode(any.value);
    expect(decoded.fromAddress).toBe(aminoMsg.value.from_address);
    expect(decoded.toAddress).toBe(aminoMsg.value.to_address);
  });

  it('throws when amino type does not match', () => {
    expect(() =>
      msgSendFromAmino({ type: 'cosmos-sdk/Foo', value: {} }),
    ).toThrow(/Expected cosmos-sdk\/MsgSend/);
  });

  it('preserves multi-coin amount arrays', () => {
    const multi = {
      type: MSG_SEND_AMINO_TYPE,
      value: {
        from_address: 'atone1qqqsyqcyq5rqwzqfpg9scrgwpugpzysndkda8p',
        to_address: 'atone1qyqszqgpqyqszqgpqyqszqgpqyqszqgpwc2vge',
        amount: [
          { denom: 'uatone', amount: '500' },
          { denom: 'uphoton', amount: '1000' },
        ],
      },
    };
    const proto = msgSendFromAmino(multi);
    expect(proto.amount).toHaveLength(2);
    expect(msgSendToAmino(proto)).toEqual(multi);
  });
});
