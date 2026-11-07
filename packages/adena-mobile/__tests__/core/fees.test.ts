import {estimateFee, withFee} from '../../src/core/fees';

const document = {
  msgs: [],
  fee: {amount: [{denom: 'ugnot', amount: '1'}], gas: '1'},
  chain_id: 'test12',
  memo: '',
  account_number: '0',
  sequence: '0',
} as any;
const account = {publicKey: new Uint8Array(33)} as any;

describe('estimateFee', () => {
  it('prices the simulated gas like the extension Average tier', async () => {
    const provider = {
      getGasPriceRatio: async () => 0.001,
      simulateTx: async () => ({gas_used: '100000'}),
    } as any;

    await expect(estimateFee(provider, account, document)).resolves.toEqual({
      gasUsed: 100000,
      gasWanted: 110000,
      gasFee: 110,
      gasPrice: 0.001,
    });
  });

  it('falls back to the minimum gas price when the chain reports none', async () => {
    const provider = {
      getGasPriceRatio: async () => 0,
      simulateTx: async () => ({gas_used: '1000'}),
    } as any;
    expect((await estimateFee(provider, account, document)).gasPrice).toBe(
      0.001,
    );
  });

  it('fails when the simulation fails, so the transaction is never offered for signing', async () => {
    const provider = {
      getGasPriceRatio: async () => 0.001,
      simulateTx: async () => {
        throw new Error('/std.InsufficientFundsError');
      },
    } as any;
    await expect(estimateFee(provider, account, document)).rejects.toThrow(
      'InsufficientFunds',
    );
  });
});

describe('withFee', () => {
  it('replaces the fee without touching the rest of the document', () => {
    expect(withFee(document, 5, 7)).toEqual({
      ...document,
      fee: {amount: [{denom: 'ugnot', amount: '7'}], gas: '5'},
    });
  });
});
