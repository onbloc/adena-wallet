import { Signature } from '@adena-wallet/sdk';
import { AdenaResponse } from './common';
import { BaseDocument } from './transactions';
import { MultisigConfig } from 'adena-module';

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

/**
 * Multisig document - document with multisig configuration
 */
export interface MultisigDocument extends BaseDocument {
  account_number: string;
  sequence: string;
  memo: string;
  signatures: Signature[];
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
  document: MultisigDocument;
  signature: Signature;
};

/**
 * Response for signing a multisig document
 */
export type SignMultisigDocumentResponse = AdenaResponse<SignMultisigDocumentResponseData>;
