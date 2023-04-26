import { Test3ApiFetcher } from './test3-api-fetcher';

let fetcher: Test3ApiFetcher;

beforeEach(() => {
  fetcher = new Test3ApiFetcher({
    chainId: 'test3',
    chainName: 'Testnet 3',
    rpcUrl: 'https://rpc.test3.gno.land',
    apiUrl: 'https://api.adena.app',
    linkUrl: 'https://gnoscan.io',
    networkId: 'test3',
  });
});

describe('testnet3 api', () => {
  test('health check', async () => {
    const result = await fetcher.getHealth();

    expect(result).not.toBeUndefined();
  });

  test('network info is not undefiend', async () => {
    const result = await fetcher.getNetwrokInfo();

    expect(result).not.toBeUndefined();
  });

  test('get blocks by 1 to 2 is not undefiend', async () => {
    const result = await fetcher.getBlocks(1, 2);

    expect(result).not.toBeUndefined();
  });

  test('get block by 100 is not undefiend', async () => {
    const result = await fetcher.getBlock(100);

    expect(result).not.toBeUndefined();
  });

  test('get block result by 1 is not undefiend', async () => {
    const result = await fetcher.getBlockResults(1);

    expect(result).not.toBeUndefined();
  });

  test('get block commit info by 1 is not undefiend', async () => {
    const result = await fetcher.getBlockCommit(1);

    expect(result).not.toBeUndefined();
  });

  test('get validators is not undefiend', async () => {
    const result = await fetcher.getValidators();

    expect(result).not.toBeUndefined();
  });

  test('get consensus state is not undefiend', async () => {
    const result = await fetcher.getConsensusState();

    expect(result).not.toBeUndefined();
  });

  test('get unconfirmed txs is not undefiend', async () => {
    const result = await fetcher.getUnconfirmedTxs();

    expect(result).not.toBeUndefined();
  });

  test('get num unconfirmed txs is not undefiend', async () => {
    const result = await fetcher.getNumUnconfirmedTxs();

    expect(result).not.toBeUndefined();
  });

  test('broadcast tx async is not undefiend', async () => {
    const result = await fetcher.broadcastTxAsync('1');

    expect(result).not.toBeUndefined();
  });

  test('get abci info is not undefiend', async () => {
    const result = await fetcher.getAbciInfo();

    expect(result).not.toBeUndefined();
  });

  test('execute abci query is not undefiend', async () => {
    const result = await fetcher.executeAbciQuery('GET_ACCOUNT_INFO', {
      query: {
        address: 'g14vhcdsyf83ngsrrqc92kmw8q9xakqjm0v8448t',
      },
    });

    expect(result).not.toBeUndefined();
  });

  test('execute abci query by QUERY_RENDER and gno.land/r/demo/users is not undefined', async () => {
    const result = await fetcher.executeAbciQuery('QUERY_RENDER', {
      data: ['gno.land/r/demo/users', ''],
    });

    expect(result).not.toBeUndefined();
  });
});
