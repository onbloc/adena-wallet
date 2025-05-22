import { GnoProvider } from '@common/provider/gno/gno-provider';
import {
  ITransactionHistoryIndexerRepository,
  ITransactionHistoryRepository,
} from '@repositories/transaction/types';
import { TransactionWithPageInfo } from '@types';

export class TransactionHistoryService {
  private transactionHistoryRepository: ITransactionHistoryRepository;
  private gnoProvider: GnoProvider | null;
  private blockTimeMap: { [key in number]: string } = {};

  constructor(
    gnoProvider: GnoProvider | null,
    transactionHistoryRepository: ITransactionHistoryRepository,
  ) {
    this.gnoProvider = gnoProvider;
    this.transactionHistoryRepository = transactionHistoryRepository;
  }

  public get supported(): boolean {
    return this.transactionHistoryRepository.type !== 'none';
  }

  public get supportedIndexer(): boolean {
    return this.transactionHistoryRepository.type === 'indexer';
  }

  public get supportedApi(): boolean {
    return this.transactionHistoryRepository.type === 'api';
  }

  /**
   * Get block time by height
   *
   * @param height
   * @returns
   */
  public async fetchBlockTime(height: number): Promise<string | null> {
    if (this.blockTimeMap?.[height]) {
      return this.blockTimeMap?.[height];
    }

    if (this.supportedIndexer) {
      return (this.transactionHistoryRepository as ITransactionHistoryIndexerRepository)
        .fetchBlockTimeByHeight(height)
        .then((time) => {
          if (!time) {
            return null;
          }
          this.blockTimeMap[height] = time;
          return time;
        })
        .catch(() => null);
    }

    if (!this.gnoProvider) {
      return null;
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

  /**
   * Fetch all transaction history
   *
   * @param address
   * @returns
   */
  public async fetchAllTransactionHistory(
    address: string,
    cursor?: string | null,
  ): Promise<TransactionWithPageInfo> {
    if (!this.supported) {
      return {
        page: {
          hasNext: false,
          cursor: null,
        },
        transactions: [],
      };
    }

    return this.transactionHistoryRepository.fetchAllTransactionHistoryBy(address, cursor);
  }

  public async fetchNativeTransactionHistory(
    address: string,
    cursor?: string | null,
  ): Promise<TransactionWithPageInfo> {
    if (!this.supported) {
      return {
        page: {
          hasNext: false,
          cursor: null,
        },
        transactions: [],
      };
    }

    return this.transactionHistoryRepository.fetchNativeTransactionHistoryBy(address, cursor);
  }

  public async fetchGRC20TransactionHistory(
    address: string,
    packagePath: string,
    cursor?: string | null,
  ): Promise<TransactionWithPageInfo> {
    if (!this.supported) {
      return {
        page: {
          hasNext: false,
          cursor: null,
        },
        transactions: [],
      };
    }

    return this.transactionHistoryRepository.fetchGRC20TransactionHistoryBy(
      address,
      packagePath,
      cursor,
    );
  }
}
