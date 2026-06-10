import { TransactionInfo } from '@types';

import {
  annotateTransactionsWithSessionAddress,
  filterTransactionsBySessionAddress,
} from './session-transaction-filter';

function makeTransaction(hash: string): TransactionInfo {
  return {
    hash,
    logo: '',
    type: 'TRANSFER',
    status: 'SUCCESS',
    title: 'Send',
    amount: {
      value: '1',
      denom: 'ugnot',
    },
    valueType: 'DEFAULT',
    date: '',
  };
}

describe('filterTransactionsBySessionAddress', () => {
  it('keeps only transactions signed by the requested session address', async () => {
    const masterAddress = 'g1master';
    const sessionAddress = 'g1session';
    const transactions = [makeTransaction('hash-a'), makeTransaction('hash-b')];
    const sessionByHash: Record<string, string | null> = {
      'hash-a': sessionAddress,
      'hash-b': 'g1other',
    };

    const result = await filterTransactionsBySessionAddress({
      transactions,
      masterAddress,
      sessionAddress,
      fetchSessionAddressByHash: async (hash) => sessionByHash[hash] ?? null,
    });

    expect(result).toEqual([
      {
        ...transactions[0],
        signedBySession: true,
        masterAddress,
        sessionAddress,
      },
    ]);
  });

  it('excludes transactions when the signer cannot be resolved', async () => {
    const result = await filterTransactionsBySessionAddress({
      transactions: [makeTransaction('hash-a')],
      masterAddress: 'g1master',
      sessionAddress: 'g1session',
      fetchSessionAddressByHash: async () => null,
    });

    expect(result).toEqual([]);
  });
});

describe('annotateTransactionsWithSessionAddress', () => {
  it('keeps all transactions and annotates only session-signed transactions', async () => {
    const masterAddress = 'g1master';
    const sessionAddress = 'g1session';
    const transactions = [makeTransaction('hash-a'), makeTransaction('hash-b')];
    const sessionByHash: Record<string, string | null> = {
      'hash-a': sessionAddress,
      'hash-b': null,
    };

    const result = await annotateTransactionsWithSessionAddress({
      transactions,
      masterAddress,
      fetchSessionAddressByHash: async (hash) => sessionByHash[hash] ?? null,
    });

    expect(result).toEqual([
      {
        ...transactions[0],
        signedBySession: true,
        masterAddress,
        sessionAddress,
      },
      transactions[1],
    ]);
  });

  it('keeps transactions unchanged when no signer can be resolved', async () => {
    const transactions = [makeTransaction('hash-a')];

    const result = await annotateTransactionsWithSessionAddress({
      transactions,
      masterAddress: 'g1master',
      fetchSessionAddressByHash: async () => null,
    });

    expect(result).toEqual(transactions);
  });
});
