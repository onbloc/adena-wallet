import {
  BroadcastTxCommitResult,
  BroadcastTxSyncResult,
  Provider,
  Tx,
  TxSignature
} from '@gnolang/tm2-js-client';

import { Document, MultisigConfig, SignerPublicKeyInfo } from './../../index.js';
import { AddressKeyring } from './address-keyring.js';
import { HDWalletKeyring } from './hd-wallet-keyring.js';
import { LedgerKeyring } from './ledger-keyring.js';
import { MultisigKeyring } from './multisig-keyring.js';
import { PrivateKeyKeyring } from './private-key-keyring.js';
import { Web3AuthKeyring } from './web3-auth-keyring.js';

export type KeyringType
  = | 'HD_WALLET'
    | 'PRIVATE_KEY'
    | 'LEDGER'
    | 'WEB3_AUTH'
    | 'AIRGAP'
    | 'MULTISIG';

export interface Keyring {
  id: string;
  type: KeyringType;
  toData: () => KeyringData;
  sign: (
    provider: Provider,
    document: Document,
    hdPath?: number
  ) => Promise<{
    signed: Tx;
    signature: TxSignature[];
  }>;
  broadcastTxSync: (
    provider: Provider,
    signedTx: Tx,
    hdPath?: number
  ) => Promise<BroadcastTxSyncResult>;
  broadcastTxCommit: (
    provider: Provider,
    signedTx: Tx,
    hdPath?: number
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
