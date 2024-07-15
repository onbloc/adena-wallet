import { AxiosInstance } from 'axios';
import { NetworkMetainfo, TransactionInfo } from '@types';
import {
  makeGRC20ReceivedTransactionsByAddressQuery,
  makeGRC20ReceivedTransactionsByAddressQueryByPackagePath,
  makeGRC20SendTransactionsByAddressQueryByPackagePath,
  makeNativeTokenReceivedTransactionsByAddressQuery,
  makeNativeTokenSendTransactionsByAddressQuery,
  makeVMTransactionsByAddressQuery,
} from './transaction-history.queries';
import {
  mapReceivedTransactionByBankMsgSend,
  mapReceivedTransactionByMsgCall,
  mapSendTransactionByBankMsgSend,
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

  private static makePageParams = (page: number, pageSize: number): { [key in string]: number } => {
    return {
      'X-PAGE': page,
      'X-PAGE-SIZE': pageSize,
    };
  };

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
