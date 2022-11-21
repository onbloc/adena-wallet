export interface History {
  hits: number;
  next: boolean;
  txs: Array<{
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
    func: string;
    send: {
      value: number;
      denom: string;
    };
    fee: {
      value: number;
      denom: string;
    };
  }>;
}
