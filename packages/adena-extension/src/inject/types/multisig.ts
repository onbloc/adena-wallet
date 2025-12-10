import { AdenaResponse } from './common';
import { BaseDocument } from './transactions';
import { MultisigConfig } from 'adena-module';
import { EncodeTxSignature } from '@services/index';

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

export interface CreateMultisigDocumentParams extends BaseDocument {
  memo?: string;
}

export interface CreateMultisigTransactionParams extends BaseDocument {
  memo?: string;
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
  signatures: Array<{
    pub_key: any;
    signature: string;
  }>;
  memo: string;
  account_number: string;
  sequence: string;
}

export interface MultisigTransactionDocument {
  tx: UnsignedTransaction;
  chainId: string;
  accountNumber: string;
  sequence: string;
}

/**
 * Response data for creating a multisig document
 */
export type CreateMultisigDocumentResponseData = {
  document: MultisigDocument;
};

/**
 * Response for creating a multisig document
 */
export type CreateMultisigDocumentResponse = AdenaResponse<CreateMultisigDocumentResponseData>;

/**
 * Response data for signing a multisig document
 */
export type SignMultisigDocumentResponseData = {
  signedDocument: MultisigDocument;
  addedSignature: EncodeTxSignature;
};

/**
 * Response for signing a multisig document
 */
export type SignMultisigDocumentResponse = AdenaResponse<SignMultisigDocumentResponseData>;

/**
 * Parameters for broadcasting a multisig transaction
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
