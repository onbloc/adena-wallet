export interface History {
  height: string;
  date: string;
  hash: string;
  result: {
    status: string;
    reason: string;
  };
  type: string;
  from?: string;
  to?: string;
  send: string;
  func: string;
  fee: string;
}
