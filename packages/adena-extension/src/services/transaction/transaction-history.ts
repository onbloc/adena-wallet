import { TransactionHistoryRepository } from '@repositories/transaction';

export class TransactionHistoryService {
  private transactionHisotyrRepository: TransactionHistoryRepository;

  constructor(transactionHisotyrRepository: TransactionHistoryRepository) {
    this.transactionHisotyrRepository = transactionHisotyrRepository;
  }

  public fetchAllTransactionHistory(address: string, page: number, from: number) {
    return this.transactionHisotyrRepository.fetchAllTransactionHistoryBy(address, page, from);
  }

  public fetchGRC20TransactionHistory(address: string, page: number, from: number) {
    return this.transactionHisotyrRepository.fetchGRC20TransactionHistoryBy(address, page, from);
  }
}
