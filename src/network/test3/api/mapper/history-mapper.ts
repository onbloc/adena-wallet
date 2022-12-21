import { GnoClientResnpose } from '@/api';
import { Test3Response } from '..';

export class HistoryMapper {
  public static toHistory = (history: Test3Response.History): GnoClientResnpose.History => {
    const hits = history.hits;
    const next = history.next;
    const txs = history.txs.map(HistoryMapper.toHistoryItem);
    return {
      hits,
      next,
      txs
    };
  };

  private static toHistoryItem = (historyItem: Test3Response.HistoryItemType): GnoClientResnpose.HistoryItemType => {
    if (historyItem.type === '/bank.MsgSend') {
      return this.toHistoryItemBankMsgSend(historyItem as Test3Response.HistoryItemBankMsgSend);
    }
    if (historyItem.type === '/vm.m_addpkg') {
      return this.toHistoryItemVmMAddPkg(historyItem as Test3Response.HistoryItemVmMAddPkg);
    }
    return this.toHistoryItemVmMCall(historyItem as Test3Response.HistoryItemVmMCall);
  }

  private static toHistoryItemBankMsgSend = (historyItem: Test3Response.HistoryItemBankMsgSend): GnoClientResnpose.HistoryItemBankMsgSend => {
    return {
      ...historyItem,
      msgNum: historyItem.msg_num,
    }
  }
  private static toHistoryItemVmMAddPkg = (historyItem: Test3Response.HistoryItemVmMAddPkg): GnoClientResnpose.HistoryItemVmMAddPkg => {
    return {
      ...historyItem,
      msgNum: historyItem.msg_num,
      package: {
        name: historyItem.package.Name,
        path: historyItem.package.Path,
        files: historyItem.package.Files.map(file => { return { name: file.Name, body: file.Body } })
      }
    }
  }
  private static toHistoryItemVmMCall = (historyItem: Test3Response.HistoryItemVmMCall): GnoClientResnpose.HistoryItemVmMCall => {
    return {
      ...historyItem,
      msgNum: historyItem.msg_num,
      pkgPath: historyItem.pkg_path
    }
  }
}
