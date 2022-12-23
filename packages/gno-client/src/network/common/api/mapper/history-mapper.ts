import { GnoClientResnpose } from '@/api';
import { CommonResponse } from '..';

export class HistoryMapper {
  public static toHistory = (history: CommonResponse.History): GnoClientResnpose.History => {
    const hits = history.hits;
    const next = history.next;
    const txs = history.txs.map(HistoryMapper.toHistoryItem);
    return {
      hits,
      next,
      txs
    };
  };

  private static toHistoryItem = (historyItem: CommonResponse.HistoryItemType): GnoClientResnpose.HistoryItemType => {
    if (historyItem.type === '/bank.MsgSend') {
      return this.toHistoryItemBankMsgSend(historyItem as CommonResponse.HistoryItemBankMsgSend);
    }
    if (historyItem.type === '/vm.m_addpkg') {
      return this.toHistoryItemVmMAddPkg(historyItem as CommonResponse.HistoryItemVmMAddPkg);
    }
    return this.toHistoryItemVmMCall(historyItem as CommonResponse.HistoryItemVmMCall);
  }

  private static toHistoryItemBankMsgSend = (historyItem: CommonResponse.HistoryItemBankMsgSend): GnoClientResnpose.HistoryItemBankMsgSend => {
    return {
      ...historyItem,
      msgNum: historyItem.msg_num,
    }
  }
  private static toHistoryItemVmMAddPkg = (historyItem: CommonResponse.HistoryItemVmMAddPkg): GnoClientResnpose.HistoryItemVmMAddPkg => {
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
  private static toHistoryItemVmMCall = (historyItem: CommonResponse.HistoryItemVmMCall): GnoClientResnpose.HistoryItemVmMCall => {
    return {
      ...historyItem,
      msgNum: historyItem.msg_num,
      pkgPath: historyItem.pkg_path
    }
  }
}
