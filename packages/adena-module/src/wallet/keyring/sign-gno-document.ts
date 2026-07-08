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
import { LocalTxSignature } from '../../proto/session/local-tx-signature';
import { compressPubkeyIfNeeded } from '../../utils/pubkey';
import { Keyring } from './keyring';
import {
  isHDWalletKeyring,
  isPrivateKeyKeyring,
  isWeb3AuthKeyring,
} from './keyring-util';
import { SignGnoOptions } from './sign-gno-options';

export type { SignGnoOptions } from './sign-gno-options';

const GNO_ADDRESS_PREFIX = 'g';

function sortJsonValue(value: unknown): unknown {
  if (typeof value !== 'object' || value === null) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(sortJsonValue);
  }

  const record = value as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};
  Object.keys(record)
    .sort()
    .forEach((key) => {
      sorted[key] = sortJsonValue(record[key]);
    });
  return sorted;
}

function sortedJsonStringify(value: unknown): string {
  return JSON.stringify(sortJsonValue(value));
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

  const signJsonString = sortedJsonStringify(signPayload);
  const signBytes = stringToUTF8(encodeCharacterSet(signJsonString));

  const signature = await keyring.signRaw(signBytes, { hdPath: opts?.hdPath });

  const publicKey = await getKeyringPublicKey(keyring, opts?.hdPath);
  // PubKeySecp256k1 proto carries the compressed (33-byte) form. keyring.publicKey
  // may be compressed (PrivateKey/Web3Auth, tm2 Wallet.fromPrivateKey compresses
  // before storing) or uncompressed (HDWallet, generateKeyPair returns 65 bytes).
  const compressedPubKey = compressPubkeyIfNeeded(publicKey);
  const pubKeyAny = {
    type_url: Secp256k1PubKeyType,
    value: PubKeySecp256k1.encode({ key: compressedPubKey }).finish(),
  };

  const sessionAddr = opts?.sessionAddr;
  let txSignature: TxSignature;
  if (sessionAddr) {
    const localSig: LocalTxSignature = {
      pub_key: pubKeyAny,
      signature,
      session_addr: sessionAddr,
    };
    txSignature = localSig;
  } else {
    txSignature = { pub_key: pubKeyAny, signature };
  }

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
  // SESSION keyring holds a publicKey field like PrivateKeyKeyring. Avoid importing
  // isSessionKeyring here to prevent a circular dependency cycle:
  // session-keyring -> sign-gno-document -> keyring-util -> session-keyring
  if (keyring.type === 'SESSION') return (keyring as unknown as { publicKey: Uint8Array }).publicKey;
  throw new Error(
    `Keyring type ${keyring.type} cannot provide a public key for signing`,
  );
}
