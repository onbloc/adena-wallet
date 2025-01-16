import { MsgAddPackage, MsgCall, MsgSend } from '@gnolang/gno-js-client';
import { MsgRun } from '@gnolang/gno-js-client/bin/proto/gno/vm';
import { BroadcastTxCommitResult } from '@gnolang/tm2-js-client';

import { AdenaResponse } from '.';

type EMessageType = '/bank.MsgSend' | '/vm.m_call' | '/vm.m_addpkg' | '/vm.m_run';

type TMessage = MsgAddPackage | MsgCall | MsgSend | MsgRun;

export type ContractMessage = {
  type: EMessageType;
  value: TMessage;
};

export type TransactionParams = {
  messages: ContractMessage[];
  memo?: string;
};

// TODO: BroadcastTxCommitResult isn't correct in case of a VM call
export type DoContractResponse = AdenaResponse<BroadcastTxCommitResult>;

export type AdenaDoContract = (params: TransactionParams) => Promise<DoContractResponse>;

type SignTxResponseData = {
  encodedTransaction: string;
};

export type SignTxResponse = AdenaResponse<SignTxResponseData>;

export type AdenaSignTx = (params: TransactionParams) => Promise<SignTxResponse>;
