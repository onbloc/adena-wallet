import { CommonResponse } from '..';

export class BroadcastTxCommitMapper {
  public static toBroadcastTxCommit = (broadcastTxCommit: CommonResponse.BroadcastTxCommit) => {
    return {
      height: broadcastTxCommit.height,
      hash: broadcastTxCommit.hash,
      deliverTx: {
        log: broadcastTxCommit.deliver_tx.log,
        data: broadcastTxCommit.deliver_tx.data,
        code: broadcastTxCommit.deliver_tx.code,
      },
      checkTx: {
        log: broadcastTxCommit.check_tx.log,
        data: broadcastTxCommit.check_tx.data,
        code: broadcastTxCommit.check_tx.code,
      },
    };
  };
}
