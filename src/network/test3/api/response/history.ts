export type HistoryItemType =
  HistoryItemBankMsgSend |
  HistoryItemVmMCall |
  HistoryItemVmMAddPkg;

export interface HistoryItem {
  height: number | null,
  date: string,
  hash: string,
  result: {
    status: 'Success' | 'Fail',
    err: {
      type: string | null,
      msg: string | null
    }
  },
  type: string,
  msg_num: number,
  func?: string,
  transfer: {
    amount: string | number | null,
    denom: string
  },
  fee: {
    amount: string | number | null,
    denom: string
  }
}

export interface HistoryItemBankMsgSend extends HistoryItem {
  from: string,
  to: string,
}

export interface HistoryItemVmMCall extends HistoryItem {
  caller: string,
  pkg_path: string,
  args: Array<string>
}

export interface HistoryItemVmMAddPkg extends HistoryItem {
  creator: string,
  package: {
    Name: string,
    Path: string,
    Files: Array<{
      Name: string,
      Body: string
    }>;
  }
}

export interface History {
  hits: number;
  next: boolean;
  txs: Array<HistoryItemType>;
}
