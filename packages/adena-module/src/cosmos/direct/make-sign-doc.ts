import { AminoMsg, StdFee } from '@cosmjs/amino';
import { PubKey } from 'cosmjs-types/cosmos/crypto/secp256k1/keys';
import { SignMode } from 'cosmjs-types/cosmos/tx/signing/v1beta1/signing';
import { AuthInfo, Fee, SignDoc, TxBody } from 'cosmjs-types/cosmos/tx/v1beta1/tx';
import { Any } from 'cosmjs-types/google/protobuf/any';

import { compressPubkeyIfNeeded } from '../../utils/pubkey';
import { aminoMsgsToAnys } from '../proto/make-tx-raw';

const COSMOS_SECP256K1_PUBKEY_TYPE_URL = '/cosmos.crypto.secp256k1.PubKey';

export interface MakeDirectSignDocParams {
  msgs: AminoMsg[];
  memo: string;
  fee: StdFee;
  sequence: string;
  chainId: string;
  accountNumber: string;
  publicKey: Uint8Array;
}

export interface DirectSignMaterial {
  signDoc: SignDoc;
  // Raw proto bytes of SignDoc. sha256 is applied inside `keyring.signRaw`, so
  // callers must pass these bytes un-hashed to the keyring.
  signBytes: Uint8Array;
  // Shared with the final TxRaw — reusing the same bytes guarantees the
  // signed SignDoc matches the broadcast payload byte-for-byte.
  bodyBytes: Uint8Array;
  authInfoBytes: Uint8Array;
}

/**
 * Build `SignDoc` for SIGN_MODE_DIRECT. Unlike AMINO, DIRECT must include the
 * signer's public key in `AuthInfo` before signing, so pubkey resolution
 * happens in the caller and is passed in here.
 */
export function makeDirectSignDoc(
  params: MakeDirectSignDocParams,
): DirectSignMaterial {
  const { msgs, memo, fee, sequence, chainId, accountNumber, publicKey } =
    params;

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
          single: { mode: SignMode.SIGN_MODE_DIRECT },
        },
        sequence: BigInt(sequence),
      },
    ],
    fee: Fee.fromPartial({
      amount: fee.amount.map((c) => ({ denom: c.denom, amount: c.amount })),
      gasLimit: BigInt(fee.gas),
    }),
  }).finish();

  const signDoc = SignDoc.fromPartial({
    bodyBytes,
    authInfoBytes,
    chainId,
    accountNumber: BigInt(accountNumber),
  });

  const signBytes = SignDoc.encode(signDoc).finish();

  return { signDoc, signBytes, bodyBytes, authInfoBytes };
}
