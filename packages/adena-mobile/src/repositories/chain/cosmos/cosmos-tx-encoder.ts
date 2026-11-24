import { MsgSend } from 'cosmjs-types/cosmos/bank/v1beta1/tx';
import { PubKey } from 'cosmjs-types/cosmos/crypto/secp256k1/keys';
import { SignMode } from 'cosmjs-types/cosmos/tx/signing/v1beta1/signing';
import { AuthInfo, Fee, SignDoc, TxBody, TxRaw } from 'cosmjs-types/cosmos/tx/v1beta1/tx';
import { Any } from 'cosmjs-types/google/protobuf/any';

import { COSMOS_MSG_SEND_AMINO_TYPE, COSMOS_MSG_SEND_TYPE_URL, CosmosMessage } from './cosmos-messages';

const SECP256K1_PUBKEY_TYPE_URL = '/cosmos.crypto.secp256k1.PubKey';

export interface CosmosFee {
  amount: { denom: string; amount: string }[];
  gas: string;
}

const toAny = (message: CosmosMessage): Any => {
  if (message.type !== COSMOS_MSG_SEND_AMINO_TYPE) {
    throw new Error(`Unknown amino message type: ${String((message as { type: string }).type)}`);
  }

  const proto = MsgSend.fromPartial({
    fromAddress: message.value.from_address,
    toAddress: message.value.to_address,
    amount: message.value.amount,
  });

  return Any.fromPartial({ typeUrl: COSMOS_MSG_SEND_TYPE_URL, value: MsgSend.encode(proto).finish() });
};

// Byte layout mirrors adena-module makeDirectSignDoc / makeTxRaw.
export const encodeTxBody = (messages: CosmosMessage[], memo: string): Uint8Array =>
  TxBody.encode(TxBody.fromPartial({ messages: messages.map(toAny), memo })).finish();

export const encodeAuthInfo = (publicKey: Uint8Array, sequence: string, fee: CosmosFee, mode: SignMode = SignMode.SIGN_MODE_DIRECT): Uint8Array =>
  AuthInfo.encode({
    signerInfos: [{
      publicKey: Any.fromPartial({ typeUrl: SECP256K1_PUBKEY_TYPE_URL, value: PubKey.encode({ key: publicKey }).finish() }),
      modeInfo: { single: { mode } },
      sequence: BigInt(sequence),
    }],
    fee: Fee.fromPartial({ amount: fee.amount.map(coin => ({ denom: coin.denom, amount: coin.amount })), gasLimit: BigInt(fee.gas) }),
  }).finish();

export const encodeSignDoc = (bodyBytes: Uint8Array, authInfoBytes: Uint8Array, chainId: string, accountNumber: string): Uint8Array =>
  SignDoc.encode(SignDoc.fromPartial({ bodyBytes, authInfoBytes, chainId, accountNumber: BigInt(accountNumber) })).finish();

export const encodeTxRaw = (bodyBytes: Uint8Array, authInfoBytes: Uint8Array, signature: Uint8Array): Uint8Array =>
  TxRaw.encode({ bodyBytes, authInfoBytes, signatures: [signature] }).finish();
