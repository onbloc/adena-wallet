import { AxiosInstance } from 'axios';
import { NetworkMetainfo, TransactionInfo, TransactionWithPageInfo } from '@types';
import {
  makeAccountTransactionsQuery,
  makeBlockTimeLegacyQuery,
  makeBlockTimeQuery,
  makeGRC20ReceivedTransactionsByAddressQuery,
  makeGRC20ReceivedTransactionsByAddressQueryByPackagePath,
  makeGRC20SendTransactionsByAddressQueryByPackagePath,
  makeGRC20TransferTransactionsQuery,
  makeNativeTokenReceivedTransactionsByAddressQuery,
  makeNativeTokenSendTransactionsByAddressQuery,
  makeNativeTransactionsQuery,
  makeVMTransactionsByAddressQuery,
} from './transaction-history.queries';
import {
  mapReceivedTransactionByBankMsgSend,
  mapReceivedTransactionByMsgCall,
  mapSendTransactionByBankMsgSend,
  mapTransactionEdgeByAddress,
  mapVMTransaction,
} from './mapper/transaction-history-query.mapper';

export class TransactionHistoryRepository {
  private axiosInstance: AxiosInstance;

  private networkMetainfo: NetworkMetainfo | null;

  constructor(axiosInstance: AxiosInstance, networkMetainfo: NetworkMetainfo | null) {
    this.axiosInstance = axiosInstance;
    this.networkMetainfo = networkMetainfo;
  }

  public get supported(): boolean {
    return !!this.networkMetainfo?.apiUrl || !!this.networkMetainfo?.indexerUrl;
  }

  public get queryUrl(): string | null {
    if (!this.networkMetainfo?.indexerUrl) {
      return null;
    }
    return this.networkMetainfo.indexerUrl + '/graphql/query';
  }

  /**
   * query a accounts's entire transaction history.
   */
  public async fetchTransactionHistoryWithCursorBy(
    address: string,
    cursor: string | null,
  ): Promise<TransactionWithPageInfo> {
    if (!this.queryUrl) {
      return {
        hasNext: false,
        cursor: null,
        transactions: [],
      };
    }

    const accountTransactionQuery = makeAccountTransactionsQuery(address, cursor, 20);
    const response = await TransactionHistoryRepository.postGraphQuery(
      this.axiosInstance,
      this.queryUrl,
      accountTransactionQuery,
    ).then((response) => response?.data?.transactions || null);

    if (!response) {
      return {
        hasNext: false,
        cursor: null,
        transactions: [],
      };
    }

    const transactions = response?.edges?.map((edge: any) =>
      mapTransactionEdgeByAddress(edge.transaction, address),
    );

    return {
      hasNext: response?.pageInfo?.hasNext || false,
      cursor: response?.pageInfo?.last || null,
      transactions,
    };
  }

  /**
   * query a accounts's native token transfer transaction history.
   */
  public async fetchNativeTransactionHistoryWithCursorBy(
    address: string,
    cursor: string | null,
  ): Promise<TransactionWithPageInfo> {
    if (!this.queryUrl) {
      return {
        hasNext: false,
        cursor: null,
        transactions: [],
      };
    }

    const nativeTokenTransactionsQuery = makeNativeTransactionsQuery(address, cursor, 20);
    const response = await TransactionHistoryRepository.postGraphQuery(
      this.axiosInstance,
      this.queryUrl,
      nativeTokenTransactionsQuery,
    ).then((response) => response?.data?.transactions || null);

    if (!response) {
      return {
        hasNext: false,
        cursor: null,
        transactions: [],
      };
    }

    const transactions = response?.edges?.map((edge: any) =>
      mapTransactionEdgeByAddress(edge.transaction, address),
    );

    return {
      hasNext: response?.pageInfo?.hasNext || false,
      cursor: response?.pageInfo?.last || null,
      transactions,
    };
  }

  /**
   * query a accounts's grc20 token transfer transaction history.
   */
  public async fetchGRC20TransactionHistoryWithCursorBy(
    address: string,
    packagePath: string,
    cursor: string | null,
  ): Promise<TransactionWithPageInfo> {
    if (!this.queryUrl) {
      return {
        hasNext: false,
        cursor: null,
        transactions: [],
      };
    }

    const grc20TransferTransactionsQuery = makeGRC20TransferTransactionsQuery(
      address,
      packagePath,
      cursor,
      20,
    );
    const response = await TransactionHistoryRepository.postGraphQuery(
      this.axiosInstance,
      this.queryUrl,
      grc20TransferTransactionsQuery,
    ).then((response) => response?.data?.transactions || null);

    if (!response) {
      return {
        hasNext: false,
        cursor: null,
        transactions: [],
      };
    }

    const transactions = response?.edges?.map((edge: any) =>
      mapTransactionEdgeByAddress(edge.transaction, address),
    );

    return {
      hasNext: response?.pageInfo?.hasNext || false,
      cursor: response?.pageInfo?.last || null,
      transactions,
    };
  }

  /**
   * XXX: The fix is required after the indexer's pagination update.
   */
  public async fetchAllTransactionHistoryBy(address: string): Promise<TransactionInfo[]> {
    if (!this.queryUrl) {
      return [];
    }

    const grc20ReceivedTransactionsQuery = makeGRC20ReceivedTransactionsByAddressQuery(address);
    const nativeTokenSendQuery = makeNativeTokenSendTransactionsByAddressQuery(address);
    const nativeTokenReceivedQuery = makeNativeTokenReceivedTransactionsByAddressQuery(address);
    const vmTransactionsQuery = makeVMTransactionsByAddressQuery(address);
    return Promise.all([
      TransactionHistoryRepository.postGraphQuery(
        this.axiosInstance,
        this.queryUrl,
        grc20ReceivedTransactionsQuery,
      ).then((result) =>
        result?.data?.transactions
          ? result?.data?.transactions.map(mapReceivedTransactionByMsgCall)
          : [],
      ),
      TransactionHistoryRepository.postGraphQuery(
        this.axiosInstance,
        this.queryUrl,
        nativeTokenSendQuery,
      ).then((result) =>
        result?.data?.transactions
          ? result?.data?.transactions.map(mapSendTransactionByBankMsgSend)
          : [],
      ),
      TransactionHistoryRepository.postGraphQuery(
        this.axiosInstance,
        this.queryUrl,
        nativeTokenReceivedQuery,
      ).then((result) =>
        result?.data?.transactions
          ? result?.data?.transactions.map(mapReceivedTransactionByBankMsgSend)
          : [],
      ),
      TransactionHistoryRepository.postGraphQuery(
        this.axiosInstance,
        this.queryUrl,
        vmTransactionsQuery,
      ).then((result) =>
        result?.data?.transactions ? result?.data?.transactions.map(mapVMTransaction) : [],
      ),
    ])
      .then((results) => results.flatMap((result) => result))
      .then((txs) => txs.sort((t1, t2) => Number(t2.height || 0) - Number(t1.height || 0)));
  }

  /**
   * XXX: The fix is required after the indexer's pagination update.
   */
  public async fetchNativeTransactionHistoryBy(address: string): Promise<TransactionInfo[]> {
    if (!this.queryUrl) {
      return [];
    }

    const nativeTokenSendQuery = makeNativeTokenSendTransactionsByAddressQuery(address);
    const nativeTokenReceivedQuery = makeNativeTokenReceivedTransactionsByAddressQuery(address);
    return Promise.all([
      TransactionHistoryRepository.postGraphQuery(
        this.axiosInstance,
        this.queryUrl,
        nativeTokenSendQuery,
      ).then((result) =>
        result?.data?.transactions
          ? result?.data?.transactions.map(mapSendTransactionByBankMsgSend)
          : [],
      ),
      TransactionHistoryRepository.postGraphQuery(
        this.axiosInstance,
        this.queryUrl,
        nativeTokenReceivedQuery,
      ).then((result) =>
        result?.data?.transactions
          ? result?.data?.transactions.map(mapReceivedTransactionByBankMsgSend)
          : [],
      ),
    ])
      .then((results) => results.flatMap((result) => result))
      .then((txs) => txs.sort((t1, t2) => Number(t2.height || 0) - Number(t1.height || 0)));
  }

  /**
   * XXX: The fix is required after the indexer's pagination update.
   */
  public async fetchGRC20TransactionHistoryBy(
    address: string,
    packagePath: string,
  ): Promise<TransactionInfo[]> {
    if (!this.queryUrl) {
      return [];
    }

    const grc20ReceivedTransactionsQuery = makeGRC20ReceivedTransactionsByAddressQueryByPackagePath(
      address,
      packagePath,
    );
    const grc20SendTransactionsQuery = makeGRC20SendTransactionsByAddressQueryByPackagePath(
      address,
      packagePath,
    );
    return Promise.all([
      TransactionHistoryRepository.postGraphQuery(
        this.axiosInstance,
        this.queryUrl,
        grc20ReceivedTransactionsQuery,
      ).then((result) =>
        result?.data?.transactions
          ? result?.data?.transactions.map(mapReceivedTransactionByMsgCall)
          : [],
      ),
      TransactionHistoryRepository.postGraphQuery(
        this.axiosInstance,
        this.queryUrl,
        grc20SendTransactionsQuery,
      ).then((result) =>
        result?.data?.transactions ? result?.data?.transactions.map(mapVMTransaction) : [],
      ),
    ])
      .then((results) => results.flatMap((result) => result))
      .then((txs) => txs.sort((t1, t2) => Number(t2.height || 0) - Number(t1.height || 0)));
  }

  /**
   * XXX: The fix is required after the indexer's pagination update.
   */
  public async fetchBlockTimeByHeight(height: number): Promise<string | null> {
    if (!this.queryUrl) {
      return null;
    }

    if (!this.networkMetainfo?.apiUrl) {
      return TransactionHistoryRepository.postGraphQuery(
        this.axiosInstance,
        this.queryUrl,
        makeBlockTimeLegacyQuery(height),
      ).then((result) => (result?.data?.blocks?.[0] ? result?.data?.blocks?.[0].time : null));
    }

    return TransactionHistoryRepository.postGraphQuery(
      this.axiosInstance,
      this.queryUrl,
      makeBlockTimeQuery(height),
    ).then((result) =>
      result?.data?.blocks?.edges?.[0] ? result?.data?.blocks.edges?.[0].block.time : null,
    );
  }

  private static postGraphQuery = <T = any>(
    axiosInstance: AxiosInstance,
    url: string,
    query: string,
    header?: { [key in string]: number } | null,
  ): Promise<T | null> => {
    return axiosInstance
      .post<T>(
        url,
        {
          query,
        },
        {
          headers: header || {},
        },
      )
      .then((response) => response.data)
      .catch((e) => {
        console.log(e);
        return null;
      });
  };
}
