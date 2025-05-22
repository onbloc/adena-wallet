import { NetworkMetainfo, TransactionWithPageInfo } from '@types';
import { AxiosInstance } from 'axios';
import {
  mapReceivedTransactionByBankMsgSend,
  mapReceivedTransactionByMsgCall,
  mapSendTransactionByBankMsgSend,
  mapVMTransaction,
} from './mapper/transaction-history-query.mapper';
import {
  makeBlockTimeLegacyQuery,
  makeBlockTimeQuery,
  makeGRC20ReceivedTransactionsByAddressQuery,
  makeGRC20ReceivedTransactionsByAddressQueryByPackagePath,
  makeGRC20SendTransactionsByAddressQueryByPackagePath,
  makeNativeTokenReceivedTransactionsByAddressQuery,
  makeNativeTokenSendTransactionsByAddressQuery,
  makeVMTransactionsByAddressQuery,
} from './transaction-history-indexer.queries';
import { ITransactionHistoryIndexerRepository } from './types';

export class TransactionHistoryIndexerRepository implements ITransactionHistoryIndexerRepository {
  private axiosInstance: AxiosInstance;

  private networkMetainfo: NetworkMetainfo | null;

  constructor(axiosInstance: AxiosInstance, networkMetainfo: NetworkMetainfo | null) {
    this.axiosInstance = axiosInstance;
    this.networkMetainfo = networkMetainfo;
  }

  public get type(): 'indexer' | 'none' {
    return this.networkMetainfo?.indexerUrl ? 'indexer' : 'none';
  }

  public get queryUrl(): string | null {
    if (!this.networkMetainfo?.indexerUrl) {
      return null;
    }
    return this.networkMetainfo.indexerUrl + '/graphql/query';
  }

  /**
   * XXX: The fix is required after the indexer's pagination update.
   */
  public async fetchAllTransactionHistoryBy(address: string): Promise<TransactionWithPageInfo> {
    if (!this.queryUrl) {
      return {
        page: {
          hasNext: false,
          cursor: null,
        },
        transactions: [],
      };
    }

    const grc20ReceivedTransactionsQuery = makeGRC20ReceivedTransactionsByAddressQuery(address);
    const nativeTokenSendQuery = makeNativeTokenSendTransactionsByAddressQuery(address);
    const nativeTokenReceivedQuery = makeNativeTokenReceivedTransactionsByAddressQuery(address);
    const vmTransactionsQuery = makeVMTransactionsByAddressQuery(address);
    return Promise.all([
      TransactionHistoryIndexerRepository.postGraphQuery(
        this.axiosInstance,
        this.queryUrl,
        grc20ReceivedTransactionsQuery,
      ).then((result) =>
        result?.data?.transactions
          ? result?.data?.transactions.map(mapReceivedTransactionByMsgCall)
          : [],
      ),
      TransactionHistoryIndexerRepository.postGraphQuery(
        this.axiosInstance,
        this.queryUrl,
        nativeTokenSendQuery,
      ).then((result) =>
        result?.data?.transactions
          ? result?.data?.transactions.map(mapSendTransactionByBankMsgSend)
          : [],
      ),
      TransactionHistoryIndexerRepository.postGraphQuery(
        this.axiosInstance,
        this.queryUrl,
        nativeTokenReceivedQuery,
      ).then((result) =>
        result?.data?.transactions
          ? result?.data?.transactions.map(mapReceivedTransactionByBankMsgSend)
          : [],
      ),
      TransactionHistoryIndexerRepository.postGraphQuery(
        this.axiosInstance,
        this.queryUrl,
        vmTransactionsQuery,
      ).then((result) =>
        result?.data?.transactions ? result?.data?.transactions.map(mapVMTransaction) : [],
      ),
    ])
      .then((results) => results.flatMap((result) => result))
      .then((txs) => ({
        page: {
          hasNext: false,
          cursor: null,
        },
        transactions: txs,
      }));
  }

  /**
   * XXX: The fix is required after the indexer's pagination update.
   */
  public async fetchNativeTransactionHistoryBy(address: string): Promise<TransactionWithPageInfo> {
    if (!this.queryUrl) {
      return {
        page: {
          hasNext: false,
          cursor: null,
        },
        transactions: [],
      };
    }

    const nativeTokenSendQuery = makeNativeTokenSendTransactionsByAddressQuery(address);
    const nativeTokenReceivedQuery = makeNativeTokenReceivedTransactionsByAddressQuery(address);
    return Promise.all([
      TransactionHistoryIndexerRepository.postGraphQuery(
        this.axiosInstance,
        this.queryUrl,
        nativeTokenSendQuery,
      ).then((result) =>
        result?.data?.transactions
          ? result?.data?.transactions.map(mapSendTransactionByBankMsgSend)
          : [],
      ),
      TransactionHistoryIndexerRepository.postGraphQuery(
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
      .then((txs) => ({
        page: {
          hasNext: false,
          cursor: null,
        },
        transactions: txs,
      }));
  }

  /**
   * XXX: The fix is required after the indexer's pagination update.
   */
  public async fetchGRC20TransactionHistoryBy(
    address: string,
    packagePath: string,
  ): Promise<TransactionWithPageInfo> {
    if (!this.queryUrl) {
      return {
        page: {
          hasNext: false,
          cursor: null,
        },
        transactions: [],
      };
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
      TransactionHistoryIndexerRepository.postGraphQuery(
        this.axiosInstance,
        this.queryUrl,
        grc20ReceivedTransactionsQuery,
      ).then((result) =>
        result?.data?.transactions
          ? result?.data?.transactions.map(mapReceivedTransactionByMsgCall)
          : [],
      ),
      TransactionHistoryIndexerRepository.postGraphQuery(
        this.axiosInstance,
        this.queryUrl,
        grc20SendTransactionsQuery,
      ).then((result) =>
        result?.data?.transactions ? result?.data?.transactions.map(mapVMTransaction) : [],
      ),
    ])
      .then((results) => results.flatMap((result) => result))
      .then((txs) => ({
        page: {
          hasNext: false,
          cursor: null,
        },
        transactions: txs,
      }));
  }

  /**
   * XXX: The fix is required after the indexer's pagination update.
   */
  public async fetchBlockTimeByHeight(height: number): Promise<string | null> {
    if (!this.queryUrl) {
      return null;
    }

    if (!this.networkMetainfo?.apiUrl) {
      return TransactionHistoryIndexerRepository.postGraphQuery(
        this.axiosInstance,
        this.queryUrl,
        makeBlockTimeLegacyQuery(height),
      ).then((result) => (result?.data?.blocks?.[0] ? result?.data?.blocks?.[0].time : null));
    }

    return TransactionHistoryIndexerRepository.postGraphQuery(
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
