export interface HistoryItem {
  height: number;
  date: string;
  hash: string;
  result: {
    status: string;
    reason: string;
  };
  type: string;
  from?: string;
  to?: string;
  func?: string;
  creator?: string;
  send?: {
    value: number;
    denom: string;
  };
  package?: any;
  fee: {
    value: number;
    denom: string;
  };
}

export interface History {
  hits: number;
  next: boolean;
  txs: Array<HistoryItem>;
}
