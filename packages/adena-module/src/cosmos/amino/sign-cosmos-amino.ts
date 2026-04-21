import { sha256 } from '@cosmjs/crypto';
import { toHex } from '@cosmjs/encoding';

import { Keyring } from '../../wallet/keyring/keyring';
import {
  isHDWalletKeyring,
  isPrivateKeyKeyring,
  isWeb3AuthKeyring,
  isLedgerKeyring,
  isMultisigKeyring,
} from '../../wallet/keyring/keyring-util';
import { makeTxRaw } from '../proto/make-tx-raw';
import { CosmosProvider } from '../providers/cosmos-provider';
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
  });

  return {
    txBytes,
    txHashHex: toHex(sha256(txBytes)).toUpperCase(),
    signDoc,
  };
}

async function resolveAccount(
  document: CosmosDocument,
  cosmosProvider: CosmosProvider,
): Promise<{ accountNumber: string; sequence: string }> {
  // Treat empty string as missing so downstream BigInt(sequence) / BigInt(gas)
  // in make-tx-raw never receives '' (which would throw a cryptic SyntaxError).
  const docAccountNumber = nonEmpty(document.accountNumber);
  const docSequence = nonEmpty(document.sequence);
  if (docAccountNumber !== undefined && docSequence !== undefined) {
    return { accountNumber: docAccountNumber, sequence: docSequence };
  }

  const account = await cosmosProvider.getAccount(document.fromAddress);
  return {
    accountNumber: docAccountNumber ?? account.accountNumber,
    sequence: docSequence ?? account.sequence,
  };
}

function nonEmpty(v: string | undefined): string | undefined {
  return v === undefined || v === '' ? undefined : v;
}

async function resolvePublicKey(
  keyring: Keyring,
  hdPath: number | undefined,
): Promise<Uint8Array> {
  if (isHDWalletKeyring(keyring)) return keyring.getPublicKey(hdPath ?? 0);
  if (isPrivateKeyKeyring(keyring)) return keyring.publicKey;
  if (isWeb3AuthKeyring(keyring)) return keyring.publicKey;

  if (isLedgerKeyring(keyring)) {
    throw new Error('Cosmos Ledger support is coming in a later phase');
  }

  if (isMultisigKeyring(keyring)) {
    throw new Error('Multisig accounts do not support Cosmos chains');
  }

  throw new Error(
    `Keyring type ${keyring.type} cannot sign Cosmos transactions`,
  );
}
