import { packagePathOfTokenPath, toRegistryKey } from '@common/utils/grc20-token-path';
import { getGrc20RegConfig } from '@common/utils/grc20reg-config';
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

  // The chain's GRC20 helper realm (if any). GRC20 transfers routed through the
  // helper appear as helperPath.Transfer(tokenKey, to, amount) in history; the
  // mapper uses this to identify the token from the first arg.
  private get grc20HelperPath(): string | undefined {
    return getGrc20RegConfig(this.networkMetainfo?.chainId).helperPath || undefined;
  }

  public async fetchAllTransactionHistoryBy(address: string): Promise<TransactionWithPageInfo> {
    if (!this.queryUrl) {
      return EMPTY_PAGE;
    }

    const result = await TransactionHistoryIndexerRepository.postGraphQuery<
      TransactionsQueryResult
    >(this.axiosInstance, this.queryUrl, makeAllTransactionHistoryQuery(address));

    const transactions = (result?.data?.getTransactions ?? []).map((tx) =>
      mapTransactionEdgeByAddress(tx, address, this.grc20HelperPath),
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
    tokenPath: string,
  ): Promise<TransactionWithPageInfo> {
    if (!this.queryUrl) {
      return EMPTY_PAGE;
    }

    // `tokenPath` is the token key `{packagePath}.{symbol}`. Derive the realm
    // path for direct transfers and the registry key (== token key) for
    // helper-routed transfers (matched against the helper's Transfer args[0]).
    const packagePath = packagePathOfTokenPath(tokenPath);
    const tokenKey = toRegistryKey(tokenPath) ?? undefined;
    const helperPath = this.grc20HelperPath;

    const result = await TransactionHistoryIndexerRepository.postGraphQuery<
      TransactionsQueryResult
    >(
      this.axiosInstance,
      this.queryUrl,
      makeGRC20TransactionHistoryQuery(address, packagePath, { helperPath, tokenKey }),
    );

    const mapped = (result?.data?.getTransactions ?? []).map((tx) => {
      const callTx = tx as TransactionResponse<MsgCallValue>;
      const firstMessage = callTx.messages?.[0];
      const isCallerSelf = firstMessage?.value?.caller === address;
      return isCallerSelf
        ? mapVMTransaction(callTx, this.grc20HelperPath)
        : mapReceivedTransactionByMsgCall(callTx, this.grc20HelperPath);
    });

    // The direct branch fetches every Transfer on the realm (pkg_path ==
    // packagePath), so a realm with multiple symbols leaks sibling tokens (e.g.
    // BAR transfers into FOO's history). Scope to the selected token: keep rows
    // whose mapped denom is the token path (event-decoded) or, when no event was
    // available, the realm path (fallback can't disambiguate symbols).
    const transactions = mapped.filter(
      (tx) => tx.amount?.denom === tokenPath || tx.amount?.denom === packagePath,
    );

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
