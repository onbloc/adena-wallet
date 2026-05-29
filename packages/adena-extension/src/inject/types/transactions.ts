import { MsgAddPackage, MsgCall, MsgRun, MsgSend } from '@gnolang/gno-js-client';
import { BroadcastTxCommitResult } from '@gnolang/tm2-js-client';
import { GnoArgumentInfo } from '@inject/message/methods/gno-connect';

import { AdenaResponse } from '.';

export const EMessageType = {
  BANK_MSG_SEND: '/bank.MsgSend',
  VM_CALL: '/vm.m_call',
  VM_ADDPKG: '/vm.m_addpkg',
  VM_RUN: '/vm.m_run',
  AUTH_CREATE_SESSION: '/auth.m_create_session',
  AUTH_REVOKE_SESSION: '/auth.m_revoke_session',
  AUTH_REVOKE_ALL_SESSIONS: '/auth.m_revoke_all_sessions',
} as const;

export type EMessageType = (typeof EMessageType)[keyof typeof EMessageType];

export const FUNCTION_NAME_MAP: Record<EMessageType, string> = {
  [EMessageType.BANK_MSG_SEND]: 'Transfer',
  [EMessageType.VM_ADDPKG]: 'AddPackage',
  [EMessageType.VM_RUN]: 'Run',
  [EMessageType.VM_CALL]: 'Call',
  [EMessageType.AUTH_CREATE_SESSION]: 'Create Session',
  [EMessageType.AUTH_REVOKE_SESSION]: 'Revoke Session',
  [EMessageType.AUTH_REVOKE_ALL_SESSIONS]: 'Revoke All Sessions',
};

export type SessionAdminMessage = {
  creator?: string;
  session_key?: unknown;
  expires_at?: unknown;
  allow_paths?: string[];
  spend_limit?: string;
  spend_period?: unknown;
};

export type TMessage = MsgAddPackage | MsgCall | MsgSend | MsgRun | SessionAdminMessage;

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

export interface ContractOptions {
  withNotification?: boolean;
  isVisibleResult?: boolean;
}

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
  msgs: unknown[];
}

// TODO: BroadcastTxCommitResult isn't correct in case of a VM call
export type DoContractResponse = AdenaResponse<BroadcastTxCommitResult>;

export type AdenaDoContract = (params: TransactionParams) => Promise<DoContractResponse>;

type SignTxResponseData = {
  encodedTransaction: string;
};

export type SignTxResponse = AdenaResponse<SignTxResponseData>;

export type AdenaSignTx = (params: TransactionParams) => Promise<SignTxResponse>;
