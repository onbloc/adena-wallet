import { AxiosInstance } from 'axios';

import { NetworkMetainfo } from '@types';
import { TokenPriceRepository } from './token-price';

const network = {
  id: 'gnoland-1',
  default: true,
  main: true,
  chainId: 'gnoland-1',
  chainName: 'Gno.land',
  networkId: 'gnoland-1',
  networkName: 'Mainnet',
  addressPrefix: 'g',
  rpcUrl: 'https://rpc.gno.land:443',
  apiUrl: 'https://api.onbloc.xyz',
} as NetworkMetainfo;

function makeAxios(get: jest.Mock): AxiosInstance {
  return { get } as unknown as AxiosInstance;
}

const response = {
  data: {
    data: {
      items: [
        {
          assetId: 'gno-land',
          name: 'Gno.land',
          symbol: 'GNOT',
          providerAssetId: 40890,
          quoteCurrency: 'USD',
          provider: 'CMC',
          price: '1.2500',
          status: 'fresh',
          priceAt: '2026-09-22T12:00:00.123456Z',
          oneDayAgoPrice: '1.0000',
          oneDayAgoPriceAt: '2026-09-21T12:00:00.5Z',
          changeRateOneDay: 25,
        },
      ],
    },
  },
};

describe('TokenPriceRepository', () => {
  it('prices the whole screen with one call to the batch endpoint', async () => {
    const get = jest.fn().mockResolvedValue(response);
    const repository = new TokenPriceRepository(makeAxios(get), network);

    await expect(repository.fetchAssetPrices()).resolves.toEqual([
      { assetId: 'gno-land', usd: 1.25, change24h: 25 },
    ]);
    expect(get).toHaveBeenCalledWith('https://api.onbloc.xyz/v1/prices');
  });

  it('asks nothing of a network with no price API', async () => {
    const get = jest.fn();
    const repository = new TokenPriceRepository(makeAxios(get), {
      ...network,
      apiUrl: '',
    } as NetworkMetainfo);

    expect(repository.supported).toBe(false);
    await expect(repository.fetchAssetPrices()).resolves.toEqual([]);
    expect(get).not.toHaveBeenCalled();
  });

  it('shares one round trip between concurrent callers', async () => {
    const get = jest.fn().mockResolvedValue(response);
    const repository = new TokenPriceRepository(makeAxios(get), network);

    await Promise.all([repository.fetchAssetPrices(), repository.fetchAssetPrices()]);

    expect(get).toHaveBeenCalledTimes(1);
  });

  it('lets a failure surface so the caller can keep its last good quotes', async () => {
    const get = jest.fn().mockRejectedValue(new Error('network down'));
    const repository = new TokenPriceRepository(makeAxios(get), network);

    await expect(repository.fetchAssetPrices()).rejects.toThrow('network down');

    // A failed request must not pin the in-flight slot and block every retry.
    get.mockResolvedValue(response);
    await expect(repository.fetchAssetPrices()).resolves.toHaveLength(1);
  });
});
