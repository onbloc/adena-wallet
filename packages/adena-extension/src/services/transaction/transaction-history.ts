import { GnoProvider } from '@common/provider/gno/gno-provider';
import { TransactionHistoryRepository } from '@repositories/transaction';
import { TransactionInfo, TransactionWithPageInfo } from '@types';

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

  /**
   * Get block time by height
   *
   * @param height
   * @returns
   */
  public async fetchBlockTime(height: number): Promise<string | null> {
    if (this.supported) {
      return this.transactionHistoryRepository
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

  /**
   * Fetch all transaction history page
   *
   * @param address
   * @param cursor
   * @returns
   */
  public async fetchAllTransactionHistoryPage(
    address: string,
    cursor: string | null,
  ): Promise<TransactionWithPageInfo> {
    if (!this.transactionHistoryRepository.supported) {
      return {
        hasNext: false,
        cursor: null,
        transactions: [],
      };
    }

    const result = await this.transactionHistoryRepository.fetchTransactionHistoryWithCursorBy(
      address,
      cursor,
    );

    return result;
  }

  /**
   * Fetch native transaction history page
   *
   * @param address
   * @param cursor
   * @returns
   */
  public async fetchNativeTransactionHistoryPage(
    address: string,
    cursor: string | null,
  ): Promise<TransactionWithPageInfo> {
    if (!this.transactionHistoryRepository.supported) {
      return {
        hasNext: false,
        cursor: null,
        transactions: [],
      };
    }

    return this.transactionHistoryRepository.fetchNativeTransactionHistoryWithCursorBy(
      address,
      cursor,
    );
  }

  /**
   * Fetch GRC20 transaction history page
   *
   * @param address
   * @param packagePath
   * @param cursor
   * @returns
   */
  public async fetchGRC20TransactionHistoryPage(
    address: string,
    packagePath: string,
    cursor: string | null,
  ): Promise<TransactionWithPageInfo> {
    if (!this.transactionHistoryRepository.supported) {
      return {
        hasNext: false,
        cursor: null,
        transactions: [],
      };
    }

    return this.transactionHistoryRepository.fetchGRC20TransactionHistoryWithCursorBy(
      address,
      packagePath,
      cursor,
    );
  }

  /**
   * Fetch all transaction history
   *
   * @param address
   * @returns
   */
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
