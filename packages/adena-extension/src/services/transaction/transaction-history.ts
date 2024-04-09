import { TransactionHistoryRepository } from '@repositories/transaction';
import { TransactionInfo } from '@types';

export class TransactionHistoryService {
  private transactionHisotyrRepository: TransactionHistoryRepository;

  constructor(transactionHisotyrRepository: TransactionHistoryRepository) {
    this.transactionHisotyrRepository = transactionHisotyrRepository;
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
