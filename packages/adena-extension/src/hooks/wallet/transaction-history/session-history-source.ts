import { TransactionInfo, TransactionWithPageInfo } from '@types';

export interface SessionHistorySource {
  primaryAddress: string | null;
  sessionAddress: string | null;
}

export interface HistoryPageParam {
  primaryCursor: string | null;
  sessionCursor: string | null;
  primaryDone: boolean;
  sessionDone: boolean;
}

export interface SessionMergedTransactionHistory extends TransactionWithPageInfo {
  sessionSourceHashes: string[];
  nextPageParam?: HistoryPageParam | null;
}

export const EMPTY_TRANSACTION_HISTORY: TransactionWithPageInfo = {
  page: {
    hasNext: false,
    cursor: null,
  },
  transactions: [],
};

function compareTransactionsDesc(a: TransactionInfo, b: TransactionInfo): number {
  const aTime = a.date ? Date.parse(a.date) : 0;
  const bTime = b.date ? Date.parse(b.date) : 0;
  if (aTime !== bTime) {
    return bTime - aTime;
  }

  return Number(b.height ?? 0) - Number(a.height ?? 0);
}

export function dedupeAndSortTransactions(transactions: TransactionInfo[]): TransactionInfo[] {
  const transactionMap = new Map<string, TransactionInfo>();

  transactions.forEach((transaction) => {
    if (!transactionMap.has(transaction.hash)) {
      transactionMap.set(transaction.hash, transaction);
    }
  });

  return Array.from(transactionMap.values()).sort(compareTransactionsDesc);
}

export function mergeSessionTransactionHistories(
  primaryHistory: TransactionWithPageInfo | null | undefined,
  sessionHistory: TransactionWithPageInfo | null | undefined,
): SessionMergedTransactionHistory {
  const primary = primaryHistory ?? EMPTY_TRANSACTION_HISTORY;
  const session = sessionHistory ?? EMPTY_TRANSACTION_HISTORY;
  const transactions = dedupeAndSortTransactions([
    ...primary.transactions,
    ...session.transactions,
  ]);

  return {
    page: primary.page,
    transactions,
    sessionSourceHashes: session.transactions.map((transaction) => transaction.hash),
  };
}

export function buildNextHistoryPageParam(
  primaryHistory: TransactionWithPageInfo,
  sessionHistory: TransactionWithPageInfo | null,
  previousPageParam: HistoryPageParam | undefined,
): HistoryPageParam | null {
  const primaryDone =
    previousPageParam?.primaryDone === true ||
    !primaryHistory.page.hasNext ||
    !primaryHistory.page.cursor;
  const sessionDone =
    previousPageParam?.sessionDone === true ||
    !sessionHistory ||
    !sessionHistory.page.hasNext ||
    !sessionHistory.page.cursor;

  if (primaryDone && sessionDone) {
    return null;
  }

  return {
    primaryCursor: primaryDone ? null : primaryHistory.page.cursor,
    sessionCursor: sessionDone ? null : sessionHistory?.page.cursor ?? null,
    primaryDone,
    sessionDone,
  };
}
