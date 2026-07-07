import { TransactionInfo } from '@types';

interface FilterTransactionsBySessionAddressParams {
  transactions: TransactionInfo[];
  masterAddress: string;
  sessionAddress: string;
  fetchSessionAddressByHash: (hash: string) => Promise<string | null>;
  fallbackSessionHashes?: ReadonlySet<string>;
}

interface AnnotateTransactionsWithSessionAddressParams {
  transactions: TransactionInfo[];
  masterAddress: string;
  fetchSessionAddressByHash: (hash: string) => Promise<string | null>;
}

export async function annotateTransactionsWithSessionAddress({
  transactions,
  masterAddress,
  fetchSessionAddressByHash,
}: AnnotateTransactionsWithSessionAddressParams): Promise<TransactionInfo[]> {
  return Promise.all(
    transactions.map(async (transaction): Promise<TransactionInfo> => {
      const signerSessionAddress = await fetchSessionAddressByHash(transaction.hash);
      if (!signerSessionAddress) {
        return transaction;
      }

      return {
        ...transaction,
        signedBySession: true,
        masterAddress,
        sessionAddress: signerSessionAddress,
      };
    }),
  );
}

export async function filterTransactionsBySessionAddress({
  transactions,
  masterAddress,
  sessionAddress,
  fetchSessionAddressByHash,
  fallbackSessionHashes,
}: FilterTransactionsBySessionAddressParams): Promise<TransactionInfo[]> {
  const results: Array<TransactionInfo | null> = await Promise.all(
    transactions.map(async (transaction): Promise<TransactionInfo | null> => {
      const signerSessionAddress = await fetchSessionAddressByHash(transaction.hash);
      const fallbackSessionAddress =
        !signerSessionAddress && fallbackSessionHashes?.has(transaction.hash)
          ? sessionAddress
          : null;
      const resolvedSessionAddress = signerSessionAddress || fallbackSessionAddress;
      if (resolvedSessionAddress !== sessionAddress) {
        return null;
      }

      return {
        ...transaction,
        signedBySession: true,
        masterAddress,
        sessionAddress: resolvedSessionAddress,
      };
    }),
  );

  return results.filter((transaction): transaction is TransactionInfo => transaction !== null);
}
