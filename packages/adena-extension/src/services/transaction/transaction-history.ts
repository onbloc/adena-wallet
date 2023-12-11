import { TransactionHistoryRepository } from '@repositories/transaction';
import { NetworkMetainfo } from '@types';
import { TransactionInfo } from '../../components/transaction-history/transaction-history/transaction-history';

export class TransactionHistoryService {
  private transactionHisotyrRepository: TransactionHistoryRepository;

  constructor(transactionHisotyrRepository: TransactionHistoryRepository) {
    this.transactionHisotyrRepository = transactionHisotyrRepository;
  }

  public setNetworkMetainfo(networkMetainfo: NetworkMetainfo): void {
    return this.transactionHisotyrRepository.setNetworkMetainfo(networkMetainfo);
  }

  public fetchAllTransactionHistory(
    address: string,
    from: number,
    size?: number,
  ): Promise<{
    hits: number;
    next: boolean;
    txs: TransactionInfo[];
  }> {
    return this.transactionHisotyrRepository.fetchAllTransactionHistoryBy(address, from, size);
  }

  public fetchNativeTransactionHistory(
    address: string,
    from: number,
    size?: number,
  ): Promise<{
    hits: number;
    next: boolean;
    txs: TransactionInfo[];
  }> {
    return this.transactionHisotyrRepository.fetchNativeTransactionHistoryBy(address, from, size);
  }

  public fetchGRC20TransactionHistory(
    address: string,
    packagePath: string,
    from: number,
    size?: number,
  ): Promise<{
    hits: number;
    next: boolean;
    txs: TransactionInfo[];
  }> {
    return this.transactionHisotyrRepository.fetchGRC20TransactionHistoryBy(
      address,
      packagePath,
      from,
      size,
    );
  }
}
