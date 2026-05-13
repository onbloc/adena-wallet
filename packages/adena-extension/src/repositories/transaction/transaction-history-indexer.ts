import { NetworkMetainfo, TransactionWithPageInfo } from '@types';
import { AxiosInstance } from 'axios';
import {
  mapReceivedTransactionByBankMsgSend,
  mapReceivedTransactionByMsgCall,
  mapSendTransactionByBankMsgSend,
  mapTransactionEdgeByAddress,
  mapVMTransaction,
} from './mapper/transaction-history-query.mapper';
import {
  BankSendValue,
  MsgCallValue,
  TransactionResponse,
} from './response/transaction-history-query-response';
import {
  makeAllTransactionHistoryQuery,
  makeBlockTimeLegacyQuery,
  makeBlockTimeQuery,
  makeGRC20TransactionHistoryQuery,
  makeNativeTransactionHistoryQuery,
} from './transaction-history-indexer.queries';
import { ITransactionHistoryIndexerRepository } from './types';

type TransactionsQueryResult = {
  data?: {
    getTransactions?: TransactionResponse[] | null;
  } | null;
} | null;

const EMPTY_PAGE: TransactionWithPageInfo = {
  page: { hasNext: false, cursor: null },
  transactions: [],
};

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

  public async fetchAllTransactionHistoryBy(address: string): Promise<TransactionWithPageInfo> {
    if (!this.queryUrl) {
      return EMPTY_PAGE;
    }

    const result = await TransactionHistoryIndexerRepository.postGraphQuery<
      TransactionsQueryResult
    >(this.axiosInstance, this.queryUrl, makeAllTransactionHistoryQuery(address));

    const transactions = (result?.data?.getTransactions ?? []).map((tx) =>
      mapTransactionEdgeByAddress(tx, address),
    );

    return {
      page: { hasNext: false, cursor: null },
      transactions,
    };
  }

  public async fetchNativeTransactionHistoryBy(address: string): Promise<TransactionWithPageInfo> {
    if (!this.queryUrl) {
      return EMPTY_PAGE;
    }

    const result = await TransactionHistoryIndexerRepository.postGraphQuery<
      TransactionsQueryResult
    >(this.axiosInstance, this.queryUrl, makeNativeTransactionHistoryQuery(address));

    const transactions = (result?.data?.getTransactions ?? []).map((tx) => {
      const bankTx = tx as TransactionResponse<BankSendValue>;
      const firstMessage = bankTx.messages?.[0];
      const isReceive = firstMessage?.value?.to_address === address;
      return isReceive
        ? mapReceivedTransactionByBankMsgSend(bankTx)
        : mapSendTransactionByBankMsgSend(bankTx);
    });

    return {
      page: { hasNext: false, cursor: null },
      transactions,
    };
  }

  public async fetchGRC20TransactionHistoryBy(
    address: string,
    packagePath: string,
  ): Promise<TransactionWithPageInfo> {
    if (!this.queryUrl) {
      return EMPTY_PAGE;
    }

    const result = await TransactionHistoryIndexerRepository.postGraphQuery<
      TransactionsQueryResult
    >(this.axiosInstance, this.queryUrl, makeGRC20TransactionHistoryQuery(address, packagePath));

    const transactions = (result?.data?.getTransactions ?? []).map((tx) => {
      const callTx = tx as TransactionResponse<MsgCallValue>;
      const firstMessage = callTx.messages?.[0];
      const isCallerSelf = firstMessage?.value?.caller === address;
      return isCallerSelf ? mapVMTransaction(callTx) : mapReceivedTransactionByMsgCall(callTx);
    });

    return {
      page: { hasNext: false, cursor: null },
      transactions,
    };
  }

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
