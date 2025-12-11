import { AdenaResponse } from './common';
import { BaseDocument } from './transactions';
import { MultisigConfig } from 'adena-module';
import { EncodeTxSignature } from '@services/index';

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
 * @deprecated
 */
export interface CreateMultisigDocumentParams extends BaseDocument {
  memo?: string;
}

export interface CreateMultisigTransactionParams extends BaseDocument {
  memo?: string;
  accountNumber?: string;
  sequence?: string;
}

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

/**
 * Response data for creating a multisig document
 * @deprecated Use CreateMultisigTransactionDocumentResponse instead
 */
export type CreateMultisigDocumentResponseData = {
  document: MultisigDocument;
};

/**
 * Response for creating a multisig document
 * @deprecated Use CreateMultisigTransactionDocumentResponse instead

 */
export type CreateMultisigDocumentResponse = AdenaResponse<CreateMultisigDocumentResponseData>;

/**
 * Response data for signing a multisig document
 * @deprecated Use SignMultisigTransactionDocumentResponse instead
 */
export type SignMultisigDocumentResponseData = {
  signedDocument: MultisigDocument;
  addedSignature: EncodeTxSignature;
};

/**
 * Response for signing a multisig document
 *  @deprecated Use SignMultisigTransactionDocumentResponse instead
 */
export type SignMultisigDocumentResponse = AdenaResponse<SignMultisigDocumentResponseData>;

/**
 * Parameters for broadcasting a multisig transaction
 * @deprecated Use new broadcast flow with SignedMultisigTransactionDocument
 */
export interface BroadcastMultisigTransactionParams {
  multisigDocument: MultisigDocument;
  commit?: boolean;
}

/**
 * Response data for broadcasting a multisig transaction
 */
export type BroadcastMultisigTransactionResponseData = {
  hash: string;
  height?: string;
};

/**
 * Response for broadcasting a multisig transaction
 */
export type BroadcastMultisigTransactionResponse =
  AdenaResponse<BroadcastMultisigTransactionResponseData>;
