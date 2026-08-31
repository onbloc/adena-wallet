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
  makeGRC20ReceivedTransactionHistoryQuery,
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

// Two queries can return the same transaction; keep one row per hash and
// restore the indexer's newest-first order.
function mergeTransactionsByHash(...groups: TransactionResponse[][]): TransactionResponse[] {
  const byHash = new Map<string, TransactionResponse>();
  for (const group of groups) {
    for (const tx of group) {
      if (!byHash.has(tx.hash)) {
        byHash.set(tx.hash, tx);
      }
    }
  }
  return [...byHash.values()].sort((a, b) => b.block_height - a.block_height || b.index - a.index);
}

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

    // Second query: a MsgRun-routed transfer only names its sender in the
    // message, so the recipient is reachable through the Transfer event alone.
    const [result, receivedResult] = await Promise.all([
      TransactionHistoryIndexerRepository.postGraphQuery<TransactionsQueryResult>(
        this.axiosInstance,
        this.queryUrl,
        makeAllTransactionHistoryQuery(address),
      ),
      TransactionHistoryIndexerRepository.postGraphQuery<TransactionsQueryResult>(
        this.axiosInstance,
        this.queryUrl,
        makeGRC20ReceivedTransactionHistoryQuery(address),
      ),
    ]);

    const transactions = mergeTransactionsByHash(
      result?.data?.getTransactions ?? [],
      receivedResult?.data?.getTransactions ?? [],
    ).map((tx) => mapTransactionEdgeByAddress(tx, address, this.grc20HelperPath));

    return {
      page: { hasNext: false, cursor: null },
      transactions,
    };
  }

  public async fetchNativeTransactionHistoryBy(address: string): Promise<TransactionWithPageInfo> {
    if (!this.queryUrl) {
      return EMPTY_PAGE;
    }

    const result =
      await TransactionHistoryIndexerRepository.postGraphQuery<TransactionsQueryResult>(
        this.axiosInstance,
        this.queryUrl,
        makeNativeTransactionHistoryQuery(address),
      );

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

    // `tokenPath` is the token key `{packagePath}.{symbol}`, which is what the
    // Transfer event identifies the token by (minus its trailing sequence).
    const packagePath = packagePathOfTokenPath(tokenPath);
    const tokenKey = toRegistryKey(tokenPath) ?? tokenPath;

    const result =
      await TransactionHistoryIndexerRepository.postGraphQuery<TransactionsQueryResult>(
        this.axiosInstance,
        this.queryUrl,
        makeGRC20TransactionHistoryQuery(address, tokenKey),
      );

    const mapped = (result?.data?.getTransactions ?? []).map((tx) => {
      const callTx = tx as TransactionResponse<MsgCallValue>;
      const firstMessage = callTx.messages?.[0];
      const isCallerSelf = firstMessage?.value?.caller === address;
      return isCallerSelf
        ? mapVMTransaction(callTx, this.grc20HelperPath, tokenKey)
        : mapReceivedTransactionByMsgCall(callTx, this.grc20HelperPath, tokenKey);
    });

    // A transaction can carry several Transfer events (e.g. a swap); the mapper
    // decodes the first one, which is not necessarily this token's. Keep only
    // the rows that ended up describing the selected token — or, when no event
    // could be decoded, the realm path (the fallback can't disambiguate
    // sibling symbols).
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
