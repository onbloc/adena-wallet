// sortedJsonStringify is not a public export of @cosmjs/amino but both
// @cosmjs/amino's serializeSignDoc and tm2 wallet.signTransaction use it via
// the same deep-import path. Keeping the single source ensures byte-level
// equivalence with the legacy tm2 signing pipeline.
import { sortedJsonStringify } from '@cosmjs/amino/build/signdoc';
import { Secp256k1 } from '@cosmjs/crypto';
import {
  encodeCharacterSet,
  Provider,
  PubKeySecp256k1,
  Secp256k1PubKeyType,
  stringToUTF8,
  Tx,
  TxSignature,
} from '@gnolang/tm2-js-client';

import { publicKeyToAddress } from '../../utils/address';
import { decodeTxMessages, Document, documentToTx } from '../../utils/messages';
import { Keyring } from './keyring';
import {
  isHDWalletKeyring,
  isPrivateKeyKeyring,
  isWeb3AuthKeyring,
} from './keyring-util';

export interface SignGnoOptions {
  hdPath?: number;
  accountNumber?: string;
  sequence?: string;
}

// Gno transaction signing on top of Keyring.signRaw.
// Byte pipeline mirrors tm2 wallet.signTransaction (wallet.js L185-250) exactly
// so that signatures are bit-equal to the legacy path.
export async function signGnoDocument(
  provider: Provider,
  document: Document,
  keyring: Keyring,
  opts?: SignGnoOptions,
): Promise<{ signed: Tx; signature: TxSignature[] }> {
  const status = await provider.getStatus();
  const chainID = status.node_info.network;

  let accountNumber = opts?.accountNumber ?? document.account_number;
  let sequence = opts?.sequence ?? document.sequence;
  if (!accountNumber || !sequence) {
    const publicKey = await getKeyringPublicKey(keyring, opts?.hdPath);
    // Use publicKeyToAddress (via tm2 KeySigner) to match SeedAccount/SingleAccount/
    // LedgerAccount address derivation, which compresses the pubkey before hashing.
    // secp256k1PubKeyToAddress does NOT compress and would produce a different
    // address for an uncompressed 65-byte pubkey as returned by generateKeyPair.
    const address = await publicKeyToAddress(publicKey, 'g');
    const account = await provider.getAccount(address);
    if (!accountNumber) accountNumber = account.BaseAccount.account_number;
    if (!sequence) sequence = account.BaseAccount.sequence;
  }

  const tx = documentToTx(document);
  if (!tx.fee) {
    throw new Error('invalid transaction fee provided');
  }

  const signPayload = {
    chain_id: chainID,
    account_number: accountNumber,
    sequence: sequence,
    fee: {
      gas_fee: tx.fee.gas_fee,
      gas_wanted: tx.fee.gas_wanted.toString(10),
    },
    msgs: decodeTxMessages(tx.messages),
    memo: tx.memo,
  };

  const signBytes = stringToUTF8(
    encodeCharacterSet(sortedJsonStringify(signPayload)),
  );

  const signature = await keyring.signRaw(signBytes, { hdPath: opts?.hdPath });

  const publicKey = await getKeyringPublicKey(keyring, opts?.hdPath);
  // PubKeySecp256k1 proto carries the compressed (33-byte) form. Keyrings store
  // uncompressed 65-byte keys (generateKeyPair -> Secp256k1.makeKeypair), so we
  // must compress before encoding, matching tm2 KeySigner.getAddress behavior.
  const compressedPubKey = Secp256k1.compressPubkey(publicKey);
  const txSignature: TxSignature = {
    pub_key: {
      type_url: Secp256k1PubKeyType,
      value: PubKeySecp256k1.encode({ key: compressedPubKey }).finish(),
    },
    signature,
  };

  const signedTx: Tx = {
    ...tx,
    signatures: [...tx.signatures, txSignature],
  };
  return { signed: signedTx, signature: signedTx.signatures };
}

async function getKeyringPublicKey(
  keyring: Keyring,
  hdPath: number | undefined,
): Promise<Uint8Array> {
  if (isHDWalletKeyring(keyring)) return keyring.getPublicKey(hdPath ?? 0);
  if (isPrivateKeyKeyring(keyring)) return keyring.publicKey;
  if (isWeb3AuthKeyring(keyring)) return keyring.publicKey;
  throw new Error(
    `Keyring type ${keyring.type} cannot provide a public key for signing`,
  );
}
