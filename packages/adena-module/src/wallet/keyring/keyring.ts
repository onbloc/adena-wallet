import {
  BroadcastTxCommitResult,
  BroadcastTxSyncResult,
  Provider,
  Tx,
  TxSignature,
} from '@gnolang/tm2-js-client';

import { Document, MultisigConfig, SignerPublicKeyInfo } from './../..';
import { AddressKeyring } from './address-keyring';
import { HDWalletKeyring } from './hd-wallet-keyring';
import { LedgerKeyring } from './ledger-keyring';
import { PrivateKeyKeyring } from './private-key-keyring';
import { Web3AuthKeyring } from './web3-auth-keyring';
import { MultisigKeyring } from './multisig-keyring';

export type KeyringType =
  | 'HD_WALLET'
  | 'PRIVATE_KEY'
  | 'LEDGER'
  | 'WEB3_AUTH'
  | 'AIRGAP'
  | 'MULTISIG';

export interface SignRawOptions {
  // HD-only hint: which derivation index to sign with. Ignored by non-HD keyrings.
  hdPath?: number;
}

export interface Keyring {
  id: string;
  type: KeyringType;
  toData: () => KeyringData;
  // Low-level byte signing. Returns raw ECDSA signature (r || s, 64 bytes).
  // Decouples keyring from chain-specific serialization rules so that Gno,
  // Cosmos AMINO, and Cosmos DIRECT pipelines can share one signing primitive.
  signRaw: (bytes: Uint8Array, opts?: SignRawOptions) => Promise<Uint8Array>;
  // Zeroes any sensitive key material held by the keyring so it cannot be
  // recovered from the JS heap after the wallet is locked. Implementations
  // must call sodium.memzero on every Uint8Array holding keys, seeds, or
  // mnemonic entropy.
  destroy: () => void;
  sign: (
    provider: Provider,
    document: Document,
    hdPath?: number,
  ) => Promise<{
    signed: Tx;
    signature: TxSignature[];
  }>;
  broadcastTxSync: (
    provider: Provider,
    signedTx: Tx,
    hdPath?: number,
  ) => Promise<BroadcastTxSyncResult>;
  broadcastTxCommit: (
    provider: Provider,
    signedTx: Tx,
    hdPath?: number,
  ) => Promise<BroadcastTxCommitResult>;
}

export interface KeyringData {
  id?: string;
  type?: KeyringType;
  publicKey?: number[];
  privateKey?: number[];
  seed?: number[];
  mnemonicEntropy?: number[];
  addressBytes?: number[];
  multisigConfig?: MultisigConfig;
  signerPublicKeys?: SignerPublicKeyInfo[];
}

export function makeKeyring(keyringData: KeyringData) {
  switch (keyringData.type) {
    case 'HD_WALLET':
      return new HDWalletKeyring(keyringData);
    case 'LEDGER':
      return new LedgerKeyring(keyringData);
    case 'PRIVATE_KEY':
      return new PrivateKeyKeyring(keyringData);
    case 'WEB3_AUTH':
      return new Web3AuthKeyring(keyringData);
    case 'AIRGAP':
      return new AddressKeyring(keyringData);
    case 'MULTISIG':
      return new MultisigKeyring(keyringData);
    default:
      throw new Error('Invalid Account type');
  }
}
