import { GnoProvider } from '@common/provider/gno/gno-provider';
import { TransactionHistoryRepository } from '@repositories/transaction';
import { TransactionInfo } from '@types';

export class TransactionHistoryService {
  private transactionHistoryRepository: TransactionHistoryRepository;
  private gnoProvider: GnoProvider | null;
  private blockTimeMap: { [key in number]: string } = {};

  constructor(
    gnoProvider: GnoProvider | null,
    transactionHistoryRepository: TransactionHistoryRepository,
  ) {
    this.gnoProvider = gnoProvider;
    this.transactionHistoryRepository = transactionHistoryRepository;
  }

  public get supported(): boolean {
    return this.transactionHistoryRepository.supported;
  }

  public async fetchBlockTime(height: number): Promise<string | null> {
    if (!this.gnoProvider) {
      return null;
    }

    if (this.blockTimeMap?.[height]) {
      return this.blockTimeMap?.[height];
    }

    return this.gnoProvider
      .getBlock(height)
      .then((response) => {
        const time = response.block_meta.header.time;
        this.blockTimeMap[height] = time;
        return time;
      })
      .catch(() => null);
  }

  public async fetchAllTransactionHistory(address: string): Promise<TransactionInfo[]> {
    if (!this.transactionHistoryRepository.supported) {
      return [];
    }
    return this.transactionHistoryRepository.fetchAllTransactionHistoryBy(address);
  }

  public fetchNativeTransactionHistory(address: string): Promise<TransactionInfo[]> {
    return this.transactionHistoryRepository.fetchNativeTransactionHistoryBy(address);
  }

  public fetchGRC20TransactionHistory(
    address: string,
    packagePath: string,
  ): Promise<TransactionInfo[]> {
    return this.transactionHistoryRepository.fetchGRC20TransactionHistoryBy(address, packagePath);
  }
}
