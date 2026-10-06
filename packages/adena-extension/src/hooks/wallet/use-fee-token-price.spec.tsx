import { renderHook } from '@testing-library/react';

import { useNetwork } from '@hooks/use-network';
import { useTokenPrices } from '@hooks/use-token-prices';
import { TokenPrice } from '@types';

import { useFeeTokenPrice } from './use-fee-token-price';

jest.mock('@hooks/use-network', () => ({
  useNetwork: jest.fn(),
}));
jest.mock('@hooks/use-token-prices', () => ({
  useTokenPrices: jest.fn(),
}));

const mockedUseNetwork = useNetwork as jest.MockedFunction<typeof useNetwork>;
const mockedUseTokenPrices = useTokenPrices as jest.MockedFunction<typeof useTokenPrices>;

const GNOT_PRICE: TokenPrice = {
  tokenId: 'ugnot',
  networkId: 'gnoland-1',
  usd: 12.5,
  change24h: null,
};

const PHOTON_PRICE: TokenPrice = {
  tokenId: 'atomone-1:uphoton',
  networkId: 'atomone-1',
  usd: 0.5,
  change24h: null,
};

const setNetwork = (networkId: string): void => {
  mockedUseNetwork.mockReturnValue({
    currentNetwork: { networkId },
  } as unknown as ReturnType<typeof useNetwork>);
};

beforeEach(() => {
  mockedUseTokenPrices.mockReturnValue({
    tokenPrices: {
      'ugnot:gnoland-1': GNOT_PRICE,
      'atomone-1:uphoton:atomone-1': PHOTON_PRICE,
    },
    isFetched: true,
    isError: false,
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('useFeeTokenPrice', () => {
  it('resolves the current network gas token from its symbol alone', () => {
    setNetwork('gnoland-1');

    const { result } = renderHook(() => useFeeTokenPrice('GNOT'));

    expect(mockedUseTokenPrices).toHaveBeenCalledWith([
      { tokenId: 'ugnot', networkId: 'gnoland-1', decimals: 6 },
    ]);
    expect(result.current).toEqual({ price: GNOT_PRICE, isLoading: false });
  });

  // Valuing a Cosmos fee at GNOT's price would put a wrong dollar figure on
  // the row, so an unnamed non-GNOT fee stays unpriced.
  it('leaves another chain fee token unpriced unless it is named', () => {
    setNetwork('gnoland-1');

    const { result } = renderHook(() => useFeeTokenPrice('PHOTON'));

    expect(mockedUseTokenPrices).toHaveBeenCalledWith([]);
    expect(result.current).toEqual({ price: undefined, isLoading: false });
  });

  it('uses the named fee token when one is given', () => {
    setNetwork('gnoland-1');

    const { result } = renderHook(() =>
      useFeeTokenPrice('PHOTON', {
        tokenId: 'atomone-1:uphoton',
        networkId: 'atomone-1',
        decimals: 6,
      }),
    );

    expect(result.current.price).toBe(PHOTON_PRICE);
  });

  it('reports a quote that has not arrived yet as loading', () => {
    setNetwork('gnoland-1');
    mockedUseTokenPrices.mockReturnValue({ tokenPrices: {}, isFetched: false, isError: false });

    const { result } = renderHook(() => useFeeTokenPrice('GNOT'));

    expect(result.current).toEqual({ price: undefined, isLoading: true });
  });

  // A failed first fetch never sets `isFetched`, so it must not keep the row
  // waiting on a quote that is not coming.
  it('stops waiting once the quote request has failed', () => {
    setNetwork('gnoland-1');
    mockedUseTokenPrices.mockReturnValue({ tokenPrices: {}, isFetched: false, isError: true });

    const { result } = renderHook(() => useFeeTokenPrice('GNOT'));

    expect(result.current).toEqual({ price: undefined, isLoading: false });
  });

  // An unquotable token has nothing to wait for, so the amount shows at once.
  it('never waits for a token nothing can quote', () => {
    setNetwork('gnoland-1');
    mockedUseTokenPrices.mockReturnValue({ tokenPrices: {}, isFetched: false, isError: false });

    const { result } = renderHook(() => useFeeTokenPrice('PHOTON'));

    expect(result.current.isLoading).toBe(false);
  });

  it('returns no quote on a network that has none', () => {
    setNetwork('test5');

    const { result } = renderHook(() => useFeeTokenPrice('GNOT'));

    expect(mockedUseTokenPrices).toHaveBeenCalledWith([
      { tokenId: 'ugnot', networkId: 'test5', decimals: 6 },
    ]);
    expect(result.current.price).toBeUndefined();
  });
});
