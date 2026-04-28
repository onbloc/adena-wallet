import { sha256 } from '@cosmjs/crypto';
import { toHex } from '@cosmjs/encoding';
import { TxRaw } from 'cosmjs-types/cosmos/tx/v1beta1/tx';

import { Keyring } from '../../wallet/keyring/keyring';
import { CosmosProvider } from '../providers/cosmos-provider';
import { resolveAccount, resolvePublicKey } from '../signer-helpers';
import { CosmosDocument, SignedCosmosTx } from '../types';

import { makeDirectSignDoc } from './make-sign-doc';

export interface SignCosmosDirectParams {
  document: CosmosDocument;
  keyring: Keyring;
  cosmosProvider: CosmosProvider;
  hdPath?: number;
}

/**
 * Sign a Cosmos `MsgSend`-style transaction with SIGN_MODE_DIRECT.
 *
 * Pipeline:
 *   CosmosDocument
 *     → resolve accountNumber / sequence (via injected cosmosProvider)
 *     → resolve signer publicKey (needed inside AuthInfo before signing)
 *     → makeDirectSignDoc → SignDoc proto encode → signBytes
 *     → keyring.signRaw(signBytes) → 64-byte r‖s signature
 *     → TxRaw.encode(bodyBytes, authInfoBytes, [signature]) → protobuf bytes
 */
export async function signCosmosDirect(
  params: SignCosmosDirectParams,
): Promise<SignedCosmosTx> {
  const { document, keyring, cosmosProvider, hdPath } = params;

  const { accountNumber, sequence } = await resolveAccount(
    document,
    cosmosProvider,
  );

  const publicKey = await resolvePublicKey(keyring, hdPath);

  const { signDoc, signBytes, bodyBytes, authInfoBytes } = makeDirectSignDoc({
    msgs: document.msgs,
    memo: document.memo,
    fee: document.fee,
    sequence,
    chainId: document.chainId,
    accountNumber,
    publicKey,
  });

  const signature = await keyring.signRaw(signBytes, { hdPath });

  const txBytes = TxRaw.encode({
    bodyBytes,
    authInfoBytes,
    signatures: [signature],
  }).finish();

  return {
    txBytes,
    txHashHex: toHex(sha256(txBytes)).toUpperCase(),
    signDoc,
  };
}
