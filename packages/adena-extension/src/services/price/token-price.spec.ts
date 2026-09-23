import { AssetPrice } from '@types';

import { ITokenPriceRepository } from '@repositories/price';
import { TokenPriceService } from './token-price';

function makeRepository(assetPrices: AssetPrice[]): ITokenPriceRepository {
  return {
    supported: true,
    fetchAssetPrices: jest.fn().mockResolvedValue(assetPrices),
  };
}

const gnotQuote: AssetPrice = { assetId: 'gno-land', usd: 1.25, change24h: 25 };
const atoneQuote: AssetPrice = { assetId: 'atomone', usd: 3.87, change24h: null };

describe('TokenPriceService', () => {
  it('bridges a token to its asset quote through the static map', async () => {
    const service = new TokenPriceService(makeRepository([gnotQuote]));

    await expect(
      service.getTokenPrices([{ tokenId: 'ugnot', networkId: 'gnoland-1' }]),
    ).resolves.toEqual({
      'ugnot:gnoland-1': { tokenId: 'ugnot', networkId: 'gnoland-1', usd: 1.25, change24h: 25 },
    });
  });

  it('leaves an unmapped token unquoted rather than guessing a price', async () => {
    const service = new TokenPriceService(makeRepository([gnotQuote]));

    await expect(
      service.getTokenPrices([{ tokenId: 'gno.land/r/foo', networkId: 'gnoland-1' }]),
    ).resolves.toEqual({});
  });

  it('does not price a mapped token on a network it is not listed for', async () => {
    const service = new TokenPriceService(makeRepository([gnotQuote, atoneQuote]));

    // Same denom, testnet gno chain: the map has no entry, so no quote.
    await expect(
      service.getTokenPrices([{ tokenId: 'ugnot', networkId: 'staging' }]),
    ).resolves.toEqual({});
    await expect(
      service.getTokenPrices([
        { tokenId: 'atomone-testnet-1:uatone', networkId: 'atomone-testnet-1' },
      ]),
    ).resolves.toEqual({});
  });

  it('keeps a mapped asset with no day-old price, reporting its change as unknown', async () => {
    const service = new TokenPriceService(makeRepository([atoneQuote]));

    const prices = await service.getTokenPrices([
      { tokenId: 'atomone-1:uatone', networkId: 'atomone-1' },
    ]);

    expect(prices['atomone-1:uatone:atomone-1'].usd).toBe(3.87);
    expect(prices['atomone-1:uatone:atomone-1'].change24h).toBeNull();
  });

  it('leaves every token unquoted when the API prices none of them', async () => {
    const service = new TokenPriceService(makeRepository([]));

    await expect(
      service.getTokenPrices([
        { tokenId: 'ugnot', networkId: 'gnoland-1' },
        { tokenId: 'atomone-1:uatone', networkId: 'atomone-1' },
      ]),
    ).resolves.toEqual({});
  });

  it('does not call the API when nothing is on screen', async () => {
    const repository = makeRepository([gnotQuote]);
    const service = new TokenPriceService(repository);

    await expect(service.getTokenPrices([])).resolves.toEqual({});
    expect(repository.fetchAssetPrices).not.toHaveBeenCalled();
  });
});
