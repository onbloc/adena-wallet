export interface TransactionHistoryResponse {
  hits: number;
  next: boolean;
  txs: HistoryItem[];
}

export interface HistoryItem {
  height: number;
  date: string;
  hash: string;
  result: {
    status: 'Success' | 'Fail';
    err: {
      type: string;
      msg: string;
    };
  };
  type: string;
  msg_num: number;
  func?: string;
  transfer: {
    amount: string;
    denom: string;
  };
  fee: {
    amount: string;
    denom: string;
  };
  to?: string;
  from?: string;
}

export interface HistoryItemBankMsgSend extends HistoryItem {
  from: string;
  to: string;
}

export interface HistoryItemVmMCall extends HistoryItem {
  caller: string;
  pkgPath: string;
  args: string[];
}

export interface HistoryItemVmMAddPkg extends HistoryItem {
  creator: string;
  package: {
    name: string;
    path: string;
    files: {
      name: string;
      body: string;
    }[];
  };
}

export interface HistoryItemVmMNoop extends HistoryItem {
  caller: string;
}