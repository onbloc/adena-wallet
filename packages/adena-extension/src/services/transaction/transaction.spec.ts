import { TransactionService } from './transaction';

import type { GnoProvider } from '@common/provider/gno/gno-provider';
import type { Account, Document, Wallet } from 'adena-module';
import type { WalletService } from '..';

const makeDocument = (): Document => ({
  msgs: [],
  fee: {
    gas: '1000000',
    amount: [{ denom: 'ugnot', amount: '5000000' }],
  },
  memo: '',
  chain_id: 'test-13',
  account_number: '1',
  sequence: '2',
});

describe('TransactionService', () => {
  it('refreshes account number and sequence before signing', async () => {
    const provider = {
      getAccountInfo: jest.fn(async () => ({
        address: 'g1master',
        coins: '10000000ugnot',
        chainId: 'test-13',
        status: 'ACTIVE',
        publicKey: null,
        accountNumber: '9',
        sequence: '3',
      })),
    } as unknown as GnoProvider;
    const service = new TransactionService({} as WalletService, provider);
    const wallet = {
      signByAccountId: jest.fn(async () => ({
        signed: { signatures: [] },
        signature: [],
      })),
    } as unknown as Wallet;
    const account = {
      id: 'account-1',
      type: 'PRIVATE_KEY',
      getAddress: jest.fn(async () => 'g1master'),
    } as unknown as Account;

    await service.createTransaction(wallet, account, makeDocument());

    expect(wallet.signByAccountId).toHaveBeenCalledWith(
      provider,
      'account-1',
      expect.objectContaining({
        account_number: '9',
        sequence: '3',
      }),
    );
  });
});
