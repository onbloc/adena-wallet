import { AminoMsg, StdFee } from '@cosmjs/amino';
import { PubKey } from 'cosmjs-types/cosmos/crypto/secp256k1/keys';
import { SignMode } from 'cosmjs-types/cosmos/tx/signing/v1beta1/signing';
import { AuthInfo, Fee, TxBody, TxRaw } from 'cosmjs-types/cosmos/tx/v1beta1/tx';
import { Any } from 'cosmjs-types/google/protobuf/any';

import { compressPubkeyIfNeeded } from '../../utils/pubkey';
import { getCodecByAminoType } from '../codec/registry';

const COSMOS_SECP256K1_PUBKEY_TYPE_URL = '/cosmos.crypto.secp256k1.PubKey';

export function aminoMsgsToAnys(msgs: AminoMsg[]): Any[] {
  return msgs.map((m) => {
    const codec = getCodecByAminoType(m.type);
    const proto = codec.fromAmino(m);
    return codec.toAny(proto);
  });
}

export interface MakeTxRawParams {
  msgs: AminoMsg[];
  memo: string;
  fee: StdFee;
  sequence: string;
  publicKey: Uint8Array;
  signature: Uint8Array;
  // Explicit — callers in AMINO/DIRECT pipelines pass the mode they actually
  // signed under. No default here: a wrong mode silently accepted by the node
  // would invalidate the signature, so force the choice at every call site.
  signMode: SignMode;
}

/**
 * Assemble the final `TxRaw` protobuf bytes for broadcasting.
 *
 * - `signature` must be the 64-byte r‖s output of `keyring.signRaw`.
 * - `publicKey` is compressed to 33 bytes if a 65-byte uncompressed form is
 *   passed. Keplr and cosmos-sdk nodes reject uncompressed secp256k1 keys
 *   with "unable to decode tx".
 */
export function makeTxRaw(params: MakeTxRawParams): Uint8Array {
  const { msgs, memo, fee, sequence, publicKey, signature, signMode } = params;

  const bodyBytes = TxBody.encode(
    TxBody.fromPartial({
      messages: aminoMsgsToAnys(msgs),
      memo,
    }),
  ).finish();

  const compressedPubKey = compressPubkeyIfNeeded(publicKey);

  const pubKeyAny = Any.fromPartial({
    typeUrl: COSMOS_SECP256K1_PUBKEY_TYPE_URL,
    value: PubKey.encode({ key: compressedPubKey }).finish(),
  });

  const authInfoBytes = AuthInfo.encode({
    signerInfos: [
      {
        publicKey: pubKeyAny,
        modeInfo: {
          single: { mode: signMode },
        },
        sequence: BigInt(sequence),
      },
    ],
    fee: Fee.fromPartial({
      amount: fee.amount.map((c) => ({ denom: c.denom, amount: c.amount })),
      gasLimit: BigInt(fee.gas),
    }),
  }).finish();

  return TxRaw.encode({
    bodyBytes,
    authInfoBytes,
    signatures: [signature],
  }).finish();
}
