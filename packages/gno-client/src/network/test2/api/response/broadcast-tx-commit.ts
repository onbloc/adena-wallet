export interface BroadcastTxCommit {
  height: string;
  hash: string;
  deliver_tx: {
    log: string;
    data: string;
    code: string;
  };
  check_tx: {
    log: string;
    data: string;
    code: string;
  };
}
