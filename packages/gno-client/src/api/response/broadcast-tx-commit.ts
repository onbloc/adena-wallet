export interface BroadcastTxCommit {
  height: string;
  hash: string;
  deliverTx: {
    log: string;
    data: string;
    code: string;
  };
  checkTx: {
    log: string;
    data: string;
    code: string;
  };
}
