import { AssetPrice } from '@types';

import { ITokenPriceRepository } from '@repositories/price';
import { TokenPriceService } from './token-price';

function makeRepository(assetPrices: AssetPrice[]): ITokenPriceRepository {
  return {
    apiUrl: 'https://api.onbloc.xyz',
    supported: true,
    fetchAssetPrices: jest.fn().mockResolvedValue(assetPrices),
  };
}

const gnotQuote: AssetPrice = {
  assetId: 'gno-land',
  provider: 'CMC',
  usd: 1.25,
  change24h: 25,
};
const atoneQuote: AssetPrice = {
  assetId: 'atomone',
  provider: 'CMC',
  usd: 3.87,
  change24h: null,
};
const gnsQuote: AssetPrice = {
  assetId: 'gno.land/r/gnoswap/gns.GNS',
  provider: 'gnoswap',
  usd: 0.0292,
  change24h: -7.5,
};

const GNS_REQUEST = {
  tokenId: 'gno.land/r/gnoswap/gns.GNS',
  networkId: 'gnoland-1',
  decimals: 6,
};
const WUGNOT_REQUEST = {
  tokenId: 'gno.land/r/gnoland/wugnot.wugnot',
  networkId: 'gnoland-1',
  decimals: 0,
};

describe('TokenPriceService', () => {
  it('bridges a token to its asset quote through the static map', async () => {
    const service = new TokenPriceService(makeRepository([gnotQuote]));

    await expect(
      service.getTokenPrices([{ tokenId: 'ugnot', networkId: 'gnoland-1', decimals: 6 }]),
    ).resolves.toEqual({
      'ugnot:gnoland-1': { tokenId: 'ugnot', networkId: 'gnoland-1', usd: 1.25, change24h: 25 },
    });
  });

  it('prices a GRC20 token under its own registry key', async () => {
    const service = new TokenPriceService(makeRepository([gnotQuote, gnsQuote]));

    await expect(service.getTokenPrices([GNS_REQUEST])).resolves.toEqual({
      'gno.land/r/gnoswap/gns.GNS:gnoland-1': {
        tokenId: 'gno.land/r/gnoswap/gns.GNS',
        networkId: 'gnoland-1',
        usd: 0.0292,
        change24h: -7.5,
      },
    });
  });

  it('leaves a GRC20 token the feed does not price unquoted', async () => {
    const service = new TokenPriceService(makeRepository([gnotQuote, gnsQuote]));

    await expect(
      service.getTokenPrices([
        { tokenId: 'gno.land/r/demo/foo.FOO', networkId: 'gnoland-1', decimals: 6 },
      ]),
    ).resolves.toEqual({});
  });

  it('reads gnot from the market feed, not from gnoswap`s own ugnot quote', async () => {
    const ugnotPoolQuote: AssetPrice = {
      assetId: 'ugnot',
      provider: 'gnoswap',
      usd: 0.99,
      change24h: 1,
    };
    const service = new TokenPriceService(makeRepository([ugnotPoolQuote, gnotQuote]));

    const prices = await service.getTokenPrices([
      { tokenId: 'ugnot', networkId: 'gnoland-1', decimals: 6 },
    ]);

    expect(prices['ugnot:gnoland-1'].usd).toBe(1.25);
  });

  it('quotes wugnot as gnot, restated for the wrapper`s own decimals', async () => {
    const wugnotPoolQuote: AssetPrice = {
      assetId: 'gno.land/r/gnoland/wugnot.wugnot',
      provider: 'gnoswap',
      usd: 0.99,
      change24h: 1,
    };
    const service = new TokenPriceService(makeRepository([wugnotPoolQuote, gnotQuote]));

    const prices = await service.getTokenPrices([WUGNOT_REQUEST]);

    // One whole wugnot is one ugnot: a millionth of the GNOT gno-land prices.
    expect(prices['gno.land/r/gnoland/wugnot.wugnot:gnoland-1'].usd).toBe(1.25e-6);
    expect(prices['gno.land/r/gnoland/wugnot.wugnot:gnoland-1'].change24h).toBe(25);
  });

  it('leaves wugnot unquoted while its decimals are unknown', async () => {
    const service = new TokenPriceService(makeRepository([gnotQuote]));

    await expect(
      service.getTokenPrices([{ ...WUGNOT_REQUEST, decimals: undefined }]),
    ).resolves.toEqual({});
  });

  it('prefers the higher-priority provider when two quote the same asset', async () => {
    const gnoswapGnot: AssetPrice = { ...gnotQuote, provider: 'gnoswap', usd: 9.99, change24h: 1 };
    const requests = [{ tokenId: 'ugnot', networkId: 'gnoland-1', decimals: 6 }];

    // Whichever order the feed lists them in, CMC wins.
    await expect(
      new TokenPriceService(makeRepository([gnoswapGnot, gnotQuote])).getTokenPrices(requests),
    ).resolves.toEqual(
      await new TokenPriceService(makeRepository([gnotQuote, gnoswapGnot])).getTokenPrices(
        requests,
      ),
    );

    const prices = await new TokenPriceService(
      makeRepository([gnoswapGnot, gnotQuote]),
    ).getTokenPrices(requests);
    expect(prices['ugnot:gnoland-1'].usd).toBe(1.25);
  });

  it('still reads a provider it does not know, ranking it behind the ones it does', async () => {
    const unknownProviderGns: AssetPrice = { ...gnsQuote, provider: 'somedex', usd: 5 };

    await expect(
      new TokenPriceService(makeRepository([unknownProviderGns])).getTokenPrices([GNS_REQUEST]),
    ).resolves.toEqual({
      'gno.land/r/gnoswap/gns.GNS:gnoland-1': {
        tokenId: 'gno.land/r/gnoswap/gns.GNS',
        networkId: 'gnoland-1',
        usd: 5,
        change24h: -7.5,
      },
    });

    const prices = await new TokenPriceService(
      makeRepository([unknownProviderGns, gnsQuote]),
    ).getTokenPrices([GNS_REQUEST]);
    expect(prices['gno.land/r/gnoswap/gns.GNS:gnoland-1'].usd).toBe(0.0292);
  });

  it('does not price a mapped token on a network it is not listed for', async () => {
    const service = new TokenPriceService(makeRepository([gnotQuote, atoneQuote]));

    // Same denom, testnet gno chain: the network is not priced, so no quote.
    await expect(
      service.getTokenPrices([{ tokenId: 'ugnot', networkId: 'staging', decimals: 6 }]),
    ).resolves.toEqual({});
    await expect(
      service.getTokenPrices([
        { tokenId: 'atomone-testnet-1:uatone', networkId: 'atomone-testnet-1', decimals: 6 },
      ]),
    ).resolves.toEqual({});
  });

  it('does not let a testnet GRC20 borrow its mainnet namesake`s price', async () => {
    const service = new TokenPriceService(makeRepository([gnsQuote]));

    await expect(
      service.getTokenPrices([{ ...GNS_REQUEST, networkId: 'staging' }]),
    ).resolves.toEqual({});
  });

  it('keeps a mapped asset with no day-old price, reporting its change as unknown', async () => {
    const service = new TokenPriceService(makeRepository([atoneQuote]));

    const prices = await service.getTokenPrices([
      { tokenId: 'atomone-1:uatone', networkId: 'atomone-1', decimals: 6 },
    ]);

    expect(prices['atomone-1:uatone:atomone-1'].usd).toBe(3.87);
    expect(prices['atomone-1:uatone:atomone-1'].change24h).toBeNull();
  });

  it('leaves every token unquoted when the API prices none of them', async () => {
    const service = new TokenPriceService(makeRepository([]));

    await expect(
      service.getTokenPrices([
        { tokenId: 'ugnot', networkId: 'gnoland-1', decimals: 6 },
        { tokenId: 'atomone-1:uatone', networkId: 'atomone-1', decimals: 6 },
      ]),
    ).resolves.toEqual({});
  });

  it('does not call the API when nothing is on screen', async () => {
    const repository = makeRepository([gnotQuote]);
    const service = new TokenPriceService(repository);

    await expect(service.getTokenPrices([])).resolves.toEqual({});
    expect(repository.fetchAssetPrices).not.toHaveBeenCalled();
  });

  it('reports the endpoint its quotes come from, so callers can scope a cache', () => {
    expect(new TokenPriceService(makeRepository([])).sourceId).toBe('https://api.onbloc.xyz');
    expect(new TokenPriceService({ ...makeRepository([]), apiUrl: null }).sourceId).toBe('');
  });
});
