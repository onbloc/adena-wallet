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
  msgNum: number,
  func?: string,
  transfer: {
    amount: number | null,
    denom: string
  },
  fee: {
    amount: number | null,
    denom: string
  }
}

export interface HistoryItemBankMsgSend extends HistoryItem {
  from: string,
  to: string,
}

export interface HistoryItemVmMCall extends HistoryItem {
  caller: string,
  pkgPath: string,
  args: Array<string>
}

export interface HistoryItemVmMAddPkg extends HistoryItem {
  creator: string,
  package: {
    name: string,
    path: string,
    files: Array<{
      name: string,
      body: string
    }>;
  }
}

export interface History {
  hits: number;
  next: boolean;
  txs: Array<HistoryItemType>;
}
