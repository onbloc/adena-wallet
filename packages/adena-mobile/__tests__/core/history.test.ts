import type {
  GRC20TokenModel,
  NetworkMetainfo,
  TransactionInfo,
} from '@types';

import {
  displayAmount,
  groupByDay,
  makeUnitMap,
  prepareForDisplay,
  transactionScannerUrl,
} from '../../src/core/history';
import type {NetworkServices} from '../../src/core/services';
import {formatHistoryAmount} from '../../src/ui/history-list';

const foo: GRC20TokenModel = {
  main: false,
  tokenId: 'gno.land/r/demo/foo.FOO',
  networkId: 'test-1',
  display: true,
  type: 'grc20',
  name: 'Foo',
  symbol: 'FOO',
  decimals: 4,
  image: '',
  pkgPath: 'gno.land/r/demo/foo',
};

const tx = (over: Partial<TransactionInfo>): TransactionInfo => ({
  hash: 'hash',
  height: 10,
  logo: '',
  type: 'TRANSFER',
  status: 'SUCCESS',
  title: 'Send',
  amount: {value: '1500000', denom: 'ugnot'},
  valueType: 'DEFAULT',
  date: '2026-10-15T10:00:00Z',
  ...over,
});

describe('amounts', () => {
  const units = makeUnitMap([foo]);

  it('shifts GNOT and GRC20 amounts by their decimals', () => {
    expect(displayAmount({value: '1500000', denom: 'ugnot'}, units)).toEqual({
      value: '1.5',
      denom: 'GNOT',
    });
    // History carries the realm path for GRC20 transfers.
    expect(
      displayAmount({value: '12345', denom: 'gno.land/r/demo/foo'}, units),
    ).toEqual({value: '1.2345', denom: 'FOO'});
  });

  it('leaves unknown tokens as they are, named by their last path part', () => {
    expect(
      displayAmount({value: '7', denom: 'gno.land/r/demo/bar'}, units),
    ).toEqual({value: '7', denom: 'bar'});
  });

  it('marks received amounts with a plus sign', () => {
    expect(
      formatHistoryAmount(
        tx({valueType: 'ACTIVE', amount: {value: '1234.5', denom: 'GNOT'}}),
      ),
    ).toBe('+1,234.5 GNOT');
    expect(
      formatHistoryAmount(
        tx({type: 'TRANSFER_GRC721', amount: {value: '7', denom: 'CAT'}}),
      ),
    ).toBe('CAT #7');
  });
});

describe('prepareForDisplay', () => {
  const fakeNet = (supportedApi: boolean) =>
    ({
      transactionHistoryService: {
        supportedApi,
        fetchBlockTime: jest.fn(async (height: number) =>
          height === 10 ? '2026-10-14T09:00:00Z' : null,
        ),
      },
    } as unknown as NetworkServices);

  it('keeps API dates and reads block times for indexer items', async () => {
    const units = makeUnitMap([]);
    const api = await prepareForDisplay(fakeNet(true), [tx({})], units);
    expect(api[0].date).toBe('2026-10-15T10:00:00Z');
    expect(api[0].amount).toEqual({value: '1.5', denom: 'GNOT'});

    const indexer = await prepareForDisplay(
      fakeNet(false),
      [tx({date: ''})],
      units,
    );
    expect(indexer[0].date).toBe('2026-10-14T09:00:00Z');
  });
});

it('groups items by day', () => {
  const groups = groupByDay([
    tx({hash: 'a', date: '2026-10-14T09:00:00Z'}),
    tx({hash: 'b', date: '2026-10-14T23:00:00Z'}),
    tx({hash: 'c', date: '2026-10-13T09:00:00Z'}),
  ]);
  expect(groups.map(group => group.transactions.map(item => item.hash))).toEqual(
    [['a', 'b'], ['c']],
  );
});

it('links a transaction to GnoScan by its hex hash and chain', () => {
  const url = transactionScannerUrl(
    {
      chainId: 'gnoland1',
      apiUrl: 'https://api.example',
      rpcUrl: 'https://rpc.example',
    } as NetworkMetainfo,
    // A 32-byte hash in base64, as the API returns it.
    Buffer.alloc(32, 7).toString('base64'),
  );
  expect(url).toBe(
    `https://gnoscan.io/transactions/details?chainId=gnoland1&txhash=${'07'.repeat(
      32,
    )}`,
  );
});
