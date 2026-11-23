import { TokenPrice, tokenPriceKey } from '../../../src/domain/token';
import { PriceRepository } from '../../../src/repositories/price.repository';
import { PriceService } from '../../../src/services/price.service';
import { COSMOS_NETWORK, GNO_NETWORK, makeToken } from '../../helpers/service-fakes';

const token = makeToken({ decimals: 6 });
const other = makeToken({ id: 'gno.land/r/demo/bar.BAR', symbol: 'BAR', decimals: 2 });
const price = (tokenId: string, usd: number, change24h: number | null = null): TokenPrice => ({ tokenId, networkId: GNO_NETWORK.id, usd, change24h });

describe('PriceService', () => {
  it('delegates support checks to the repository', () => {
    const repository: PriceRepository = { isSupported: jest.fn(network => network.id === GNO_NETWORK.id), getPrices: jest.fn() };
    const service = new PriceService(repository);

    expect(service.isSupported(GNO_NETWORK)).toBe(true);
    expect(service.isSupported(COSMOS_NETWORK)).toBe(false);
  });

  it('keys prices by token and network', async () => {
    const quote = price(token.id, 2);
    const repository: PriceRepository = { isSupported: () => true, getPrices: jest.fn(async () => [quote]) };

    await expect(new PriceService(repository).getPrices([token, other], GNO_NETWORK)).resolves.toEqual({ [tokenPriceKey(token.id, GNO_NETWORK.id)]: quote });
    expect(repository.getPrices).toHaveBeenCalledWith([token, other], GNO_NETWORK);
  });

  describe('valueOf', () => {
    it('is null without a price', () => {
      expect(PriceService.valueOf('1000000', token)).toBeNull();
    });

    it('scales by decimals', () => {
      expect(PriceService.valueOf('2500000', token, price(token.id, 2))).toBe(5);
      expect(PriceService.valueOf('150', other, price(other.id, 10))).toBe(15);
    });
  });

  describe('portfolio', () => {
    const prices = {
      [tokenPriceKey(token.id, token.networkId)]: price(token.id, 1, 25),
      [tokenPriceKey(other.id, other.networkId)]: price(other.id, 1, null),
    };

    it('is null when nothing is priced', () => {
      expect(PriceService.portfolio([], prices)).toBeNull();
      expect(PriceService.portfolio([{ token: makeToken({ id: 'unpriced' }), amount: '1' }], prices)).toBeNull();
      expect(PriceService.portfolio([{ token }], prices)).toBeNull();
    });

    it('sums priced holdings and derives the 24h change', () => {
      // 1 USD now, +25% => 0.8 USD a day ago.
      const result = PriceService.portfolio([{ token, amount: '1000000' }, { token: makeToken({ id: 'unpriced' }), amount: '5' }], prices);

      expect(result?.usd).toBe(1);
      expect(result?.change24h).toBeCloseTo(25);
    });

    it('treats an unknown 24h change as flat', () => {
      const result = PriceService.portfolio([{ token, amount: '1000000' }, { token: other, amount: '100' }], prices);

      expect(result?.usd).toBe(2);
      expect(result?.change24h).toBeCloseTo((2 - 1.8) / 1.8 * 100);
    });

    it('has no change for a zero-valued portfolio', () => {
      expect(PriceService.portfolio([{ token, amount: '0' }], prices)).toEqual({ usd: 0, change24h: null });
    });
  });
});
