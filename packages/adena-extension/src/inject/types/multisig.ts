import { AdenaResponse } from './common';
import { BaseDocument } from './transactions';
import { MultisigConfig } from 'adena-module';
import { EncodeTxSignature } from '@services/index';
import { BroadcastTxCommitResult } from '@gnolang/tm2-js-client';

export interface Message {
  type: string;
  value: any;
}

export interface Signature {
  pub_key: {
    type: '/tm.PubKeySecp256k1';
    value: string;
  };
  signature: string;
}

export interface MultisigPubKey {
  type: '/tm.PubKeyMultisig';
  value: {
    threshold: string;
    pubkeys: Array<{
      type: '/tm.PubKeySecp256k1';
      value: string;
    }>;
  };
}

export interface MultisigSignature {
  pub_key: MultisigPubKey;
  signature: string;
}

/**
 * Signer status for multisig transactions
 */
export enum SignerStatusType {
  SIGNED = 'SIGNED',
  PENDING = 'PENDING',
  NONE = 'NONE',
}

/**
 * Signer information
 */
export type SignerInfo = {
  address: string;
  status: SignerStatusType;
};

export interface StandardDocument extends BaseDocument {
  account_number: string;
  sequence: string;
  memo: string;
}

/**
 * Multisig document - document with multisig configuration
 * @deprecated Use MultisigTransactionDocument for new multisig flow
 */
export interface MultisigDocument {
  document: StandardDocument;
  signatures: EncodeTxSignature[];
  multisigConfig: MultisigConfig;
}

/**
 * Parameters for creating a multisig account
 */
export interface CreateMultisigAccountParams {
  signers: string[];
  threshold: number;
  noSort?: boolean;
}

/**
 * Response data for creating a multisig account
 */
export type CreateMultisigAccountResponseData = {
  multisigAddress: string;
  multisigAddressBytes: Uint8Array;
};

/**
 * Response for creating a multisig account
 */
export type CreateMultisigAccountResponse = AdenaResponse<CreateMultisigAccountResponseData>;

/**
 * Parameters for creating a multisig transaction
 */
export interface CreateMultisigTransactionParams extends BaseDocument {
  memo?: string;
  accountNumber?: string;
  sequence?: string;
}

/**
 * Response data for creating a multisig transaction document
 */
export type CreateMultisigTransactionResponseData = {
  document: MultisigTransactionDocument;
};

/**
 * Response for creating a multisig transaction document
 */
export type CreateMultisigTransactionResponse =
  AdenaResponse<CreateMultisigTransactionResponseData>;

/**
 * Response data for signing a multisig document
 */
export type SignMultisigTransactionResponseData = {
  signedDocument: MultisigTransactionDocument;
  addedSignature: EncodeTxSignature;
};

/**
 * Response for signing a multisig document
 */
export type SignMultisigTransactionResponse = AdenaResponse<SignMultisigTransactionResponseData>;

/**
 * Parameters for broadcasting a multisig transaction
 */
export interface BroadcastMultisigTransactionParams {
  document: MultisigTransactionDocument;
}

/**
 * Response data for broadcasting a multisig transaction
 */
export type BroadcastMultisigTransactionResponseData = BroadcastTxCommitResult;

/**
 * Response for broadcasting a multisig transaction
 */
export type BroadcastMultisigTransactionResponse =
  AdenaResponse<BroadcastMultisigTransactionResponseData>;

export interface UnsignedTransaction {
  msg: Array<{
    '@type': string;
    [key: string]: any;
  }>;
  fee: {
    gas_wanted: string;
    gas_fee: string;
  };
  signatures: null;
  memo: string;
}

export interface SignedTransaction {
  msg: Array<{
    '@type': string;
    [key: string]: any;
  }>;
  fee: {
    gas_wanted: string;
    gas_fee: string;
  };
  signatures: MultisigSignature[];
  memo: string;
  account_number: string;
  sequence: string;
}

export interface MultisigTransactionDocument {
  tx: UnsignedTransaction;
  chainId: string;
  accountNumber: string;
  sequence: string;
  multisigSignatures?: Signature[];
  multisigConfig?: MultisigConfig;
}

export interface SignedMultisigTransactionDocument {
  tx: SignedTransaction;
  chainId: string;
  accountNumber: string;
  sequence: string;
}
