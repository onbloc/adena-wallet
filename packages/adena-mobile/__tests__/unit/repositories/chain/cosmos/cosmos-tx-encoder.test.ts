import { toHex } from '@cosmjs/encoding';
import { makeDirectSignDoc, makeTxRaw } from 'adena-module';
import { MsgSend } from 'cosmjs-types/cosmos/bank/v1beta1/tx';
import { PubKey } from 'cosmjs-types/cosmos/crypto/secp256k1/keys';
import { SignMode } from 'cosmjs-types/cosmos/tx/signing/v1beta1/signing';
import { AuthInfo, SignDoc, TxBody, TxRaw } from 'cosmjs-types/cosmos/tx/v1beta1/tx';

import { CosmosMessage } from '../../../../../src/repositories/chain/cosmos/cosmos-messages';
import { encodeAuthInfo, encodeSignDoc, encodeTxBody, encodeTxRaw } from '../../../../../src/repositories/chain/cosmos/cosmos-tx-encoder';

const FROM = 'atone1jg8mtutu9khhfwc4nxmuhcpftf0pajdhn6qkzq';
const TO = 'atone1qyqszqgpqyqszqgpqyqszqgpqyqszqgpjnp7du';
const publicKey = new Uint8Array(33).fill(3);
const fee = { amount: [{ denom: 'uphoton', amount: '28080' }], gas: '104000' };
const messages: CosmosMessage[] = [
  { type: 'cosmos-sdk/MsgSend', value: { from_address: FROM, to_address: TO, amount: [{ denom: 'uatone', amount: '1000000' }, { denom: 'uphoton', amount: '1' }] } },
  { type: 'cosmos-sdk/MsgSend', value: { from_address: FROM, to_address: FROM, amount: [] } },
];

describe('cosmos tx encoder', () => {
  it('matches adena-module SIGN_MODE_DIRECT bytes', () => {
    const reference = makeDirectSignDoc({ msgs: messages, memo: 'hi', fee, sequence: '4', chainId: 'atomone-1', accountNumber: '12', publicKey });
    const bodyBytes = encodeTxBody(messages, 'hi');
    const authInfoBytes = encodeAuthInfo(publicKey, '4', fee);

    expect(toHex(bodyBytes)).toBe(toHex(reference.bodyBytes));
    expect(toHex(authInfoBytes)).toBe(toHex(reference.authInfoBytes));
    expect(toHex(encodeSignDoc(bodyBytes, authInfoBytes, 'atomone-1', '12'))).toBe(toHex(reference.signBytes));

    const signature = new Uint8Array(64).fill(9);

    expect(toHex(encodeTxRaw(bodyBytes, authInfoBytes, signature)))
      .toBe(toHex(makeTxRaw({ msgs: messages, memo: 'hi', fee, sequence: '4', publicKey, signature, signMode: SignMode.SIGN_MODE_DIRECT })));
  });

  it('encodes amino MsgSend as protobuf Any', () => {
    const body = TxBody.decode(encodeTxBody(messages, ''));

    expect(body.memo).toBe('');
    expect(body.messages.map(message => message.typeUrl)).toEqual(['/cosmos.bank.v1beta1.MsgSend', '/cosmos.bank.v1beta1.MsgSend']);
    expect(MsgSend.decode(body.messages[0].value)).toEqual({ fromAddress: FROM, toAddress: TO, amount: messages[0].value.amount });
    expect(MsgSend.decode(body.messages[1].value).amount).toEqual([]);
    expect(TxBody.decode(encodeTxBody([], 'm')).messages).toEqual([]);
  });

  it('rejects unknown amino types', () => {
    expect(() => encodeTxBody([{ type: 'cosmos-sdk/MsgDelegate', value: {} } as unknown as CosmosMessage], '')).toThrow('Unknown amino message type: cosmos-sdk/MsgDelegate');
  });

  it('encodes the signer, sequence and fee in AuthInfo', () => {
    const authInfo = AuthInfo.decode(encodeAuthInfo(publicKey, '18446744073709551615', { amount: [], gas: '0' }, SignMode.SIGN_MODE_LEGACY_AMINO_JSON));
    const [signer] = authInfo.signerInfos;

    expect(signer.publicKey?.typeUrl).toBe('/cosmos.crypto.secp256k1.PubKey');
    expect(PubKey.decode(signer.publicKey!.value).key).toEqual(publicKey);
    expect(signer.modeInfo?.single?.mode).toBe(SignMode.SIGN_MODE_LEGACY_AMINO_JSON);
    expect(signer.sequence).toBe(18446744073709551615n);
    expect(authInfo.fee).toMatchObject({ amount: [], gasLimit: 0n });
    expect(AuthInfo.decode(encodeAuthInfo(publicKey, '0', fee)).fee?.amount).toEqual(fee.amount);
  });

  it('rejects non-integer sequences and gas', () => {
    expect(() => encodeAuthInfo(publicKey, 'x', fee)).toThrow();
    expect(() => encodeAuthInfo(publicKey, '1', { ...fee, gas: '1.5' })).toThrow();
    expect(() => encodeSignDoc(new Uint8Array(), new Uint8Array(), 'c', 'abc')).toThrow();
  });

  it('round-trips SignDoc and TxRaw', () => {
    const body = new Uint8Array([1, 2]);
    const auth = new Uint8Array([3]);

    expect(SignDoc.decode(encodeSignDoc(body, auth, 'atomone-1', '7'))).toEqual({ bodyBytes: body, authInfoBytes: auth, chainId: 'atomone-1', accountNumber: 7n });
    expect(TxRaw.decode(encodeTxRaw(body, auth, new Uint8Array([4])))).toEqual({ bodyBytes: body, authInfoBytes: auth, signatures: [new Uint8Array([4])] });
  });
});
