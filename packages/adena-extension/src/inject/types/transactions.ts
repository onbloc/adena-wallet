import { MsgAddPackage, MsgCall, MsgSend } from '@gnolang/gno-js-client';
import { MsgRun } from '@gnolang/gno-js-client/bin/proto/gno/vm';
import { BroadcastTxCommitResult } from '@gnolang/tm2-js-client';
import { GnoArgumentInfo } from '@inject/message/methods/gno-connect';
import { Signature } from '@adena-wallet/sdk';

import { AdenaResponse } from '.';

export const EMessageType = {
  BANK_MSG_SEND: '/bank.MsgSend',
  VM_CALL: '/vm.m_call',
  VM_ADDPKG: '/vm.m_addpkg',
  VM_RUN: '/vm.m_run',
} as const;

export type EMessageType = (typeof EMessageType)[keyof typeof EMessageType];

export const FUNCTION_NAME_MAP: Record<EMessageType, string> = {
  [EMessageType.BANK_MSG_SEND]: 'Transfer',
  [EMessageType.VM_ADDPKG]: 'AddPackage',
  [EMessageType.VM_RUN]: 'Run',
  [EMessageType.VM_CALL]: 'Call',
};

export type TMessage = MsgAddPackage | MsgCall | MsgSend | MsgRun;

export type ContractMessage = {
  type: EMessageType;
  value: TMessage;
};

export type TransactionParams = {
  messages: ContractMessage[];
  memo?: string;
  networkInfo?: {
    chainId: string;
    rpcUrl: string;
  };
  arguments?: GnoArgumentInfo[] | null;
};

/**
 * Transaction fee structure
 */
export interface Fee {
  amount: {
    amount: string;
    denom: string;
  }[];
  gas: string;
}

/**
 * Base document structure shared by all document types
 */
export interface BaseDocument {
  chain_id: string;
  fee: Fee;
  msgs: any[];
}

/**
 * Signed document - standard transaction document with signatures
 */
export interface SignedDocument extends BaseDocument {
  account_number: string;
  sequence: string;
  memo: string;
  signatures: Signature[];
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

// TODO: BroadcastTxCommitResult isn't correct in case of a VM call
export type DoContractResponse = AdenaResponse<BroadcastTxCommitResult>;

export type AdenaDoContract = (params: TransactionParams) => Promise<DoContractResponse>;

type SignTxResponseData = {
  encodedTransaction: string;
};

export type SignTxResponse = AdenaResponse<SignTxResponseData>;

export type AdenaSignTx = (params: TransactionParams) => Promise<SignTxResponse>;
