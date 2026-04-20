import { sha256 } from '@cosmjs/crypto';
import { toHex } from '@cosmjs/encoding';
import { SignMode } from 'cosmjs-types/cosmos/tx/signing/v1beta1/signing';

import { Keyring } from '../../wallet/keyring/keyring';
import { makeTxRaw } from '../proto/make-tx-raw';
import { CosmosProvider } from '../providers/cosmos-provider';
import { resolveAccount, resolvePublicKey } from '../signer-helpers';
import { CosmosDocument, SignedCosmosTx } from '../types';

import { makeStdSignDoc } from './make-std-sign-doc';
import { serializeSignDoc } from './serialize-sign-doc';

export interface SignCosmosAminoParams {
  document: CosmosDocument;
  keyring: Keyring;
  // Injected by the caller (adena-extension supplies CosmosLcdProvider,
  // which implements this interface). Mirrors the Gno `Provider` DI
  // pattern so adena-module stays free of HTTP-client dependencies.
  cosmosProvider: CosmosProvider;
  hdPath?: number;
}

/**
 * Sign a Cosmos `MsgSend`-style transaction with SIGN_MODE_LEGACY_AMINO_JSON.
 *
 * Pipeline:
 *   CosmosDocument
 *     → resolve accountNumber / sequence (via injected cosmosProvider)
 *     → makeStdSignDoc → serializeSignDoc → signBytes
 *     → keyring.signRaw(signBytes) → 64-byte r‖s signature
 *     → makeTxRaw(msgs, signature, pubkey, fee, sequence) → TxRaw protobuf bytes
 */
export async function signCosmosAmino(
  params: SignCosmosAminoParams,
): Promise<SignedCosmosTx> {
  const { document, keyring, cosmosProvider, hdPath } = params;

  const { accountNumber, sequence } = await resolveAccount(document, cosmosProvider);

  const signDoc = makeStdSignDoc({
    chainId: document.chainId,
    accountNumber,
    sequence,
    msgs: document.msgs,
    fee: document.fee,
    memo: document.memo,
  });

  const signBytes = serializeSignDoc(signDoc);
  const signature = await keyring.signRaw(signBytes, { hdPath });

  const publicKey = await resolvePublicKey(keyring, hdPath);

  const txBytes = makeTxRaw({
    msgs: document.msgs,
    memo: document.memo,
    fee: document.fee,
    sequence,
    publicKey,
    signature,
    signMode: SignMode.SIGN_MODE_LEGACY_AMINO_JSON,
  });

  return {
    txBytes,
    txHashHex: toHex(sha256(txBytes)).toUpperCase(),
    signDoc,
  };
}
