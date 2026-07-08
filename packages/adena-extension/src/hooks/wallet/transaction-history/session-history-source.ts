import { TransactionInfo } from '@types';

function compareTransactionsDesc(a: TransactionInfo, b: TransactionInfo): number {
  const aTime = a.date ? Date.parse(a.date) : 0;
  const bTime = b.date ? Date.parse(b.date) : 0;
  if (aTime !== bTime) {
    return bTime - aTime;
  }

  return Number(b.height ?? 0) - Number(a.height ?? 0);
}

// Dedupe (by hash) and sort newest-first. Kept as a shared helper because both
// the API-paged and indexer-paged history hooks accumulate pages that may
// overlap (e.g. a refetch re-returning the first page).
export function dedupeAndSortTransactions(transactions: TransactionInfo[]): TransactionInfo[] {
  const transactionMap = new Map<string, TransactionInfo>();

  transactions.forEach((transaction) => {
    if (!transactionMap.has(transaction.hash)) {
      transactionMap.set(transaction.hash, transaction);
    }
  });

  return Array.from(transactionMap.values()).sort(compareTransactionsDesc);
}
