// sortedJsonStringify is not a public export of @cosmjs/amino but both
// @cosmjs/amino's serializeSignDoc and tm2 wallet.signTransaction use it via
// the same deep-import path. Keeping the single source ensures byte-level
// equivalence with the legacy tm2 signing pipeline.
import { sortedJsonStringify } from '@cosmjs/amino/build/signdoc';
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
import { compressPubkeyIfNeeded } from '../../utils/pubkey';
import { Keyring, SignRawOptions } from './keyring';
import {
  isHDWalletKeyring,
  isPrivateKeyKeyring,
  isWeb3AuthKeyring,
} from './keyring-util';

const GNO_ADDRESS_PREFIX = 'g';

export interface SignGnoOptions extends SignRawOptions {
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
  const accountNumberMissing = accountNumber === undefined || accountNumber === '';
  const sequenceMissing = sequence === undefined || sequence === '';
  if (accountNumberMissing || sequenceMissing) {
    const publicKey = await getKeyringPublicKey(keyring, opts?.hdPath);
    // Use publicKeyToAddress (via tm2 KeySigner) to match SeedAccount/SingleAccount/
    // LedgerAccount address derivation, which compresses the pubkey before hashing.
    // Gno pipeline fixes addressPrefix to 'g' by design; multichain pipelines
    // (Cosmos AMINO/DIRECT) will supply their own prefix.
    const address = await publicKeyToAddress(publicKey, GNO_ADDRESS_PREFIX);
    const account = await provider.getAccount(address);
    if (accountNumberMissing) accountNumber = account.BaseAccount.account_number;
    if (sequenceMissing) sequence = account.BaseAccount.sequence;
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
  // PubKeySecp256k1 proto carries the compressed (33-byte) form. keyring.publicKey
  // may be compressed (PrivateKey/Web3Auth — tm2 Wallet.fromPrivateKey compresses
  // before storing) or uncompressed (HDWallet — generateKeyPair returns 65 bytes).
  const compressedPubKey = compressPubkeyIfNeeded(publicKey);
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
