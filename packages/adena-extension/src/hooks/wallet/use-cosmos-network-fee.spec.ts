import { useQuery } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { CosmosDocument } from 'adena-module';

import { ATOMONE_CHAIN } from '@common/utils/chain-utils';
import { useAdenaContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';

import { useCosmosNetworkFee } from './use-cosmos-network-fee';

jest.mock('@tanstack/react-query', () => ({ useQuery: jest.fn() }));
jest.mock('@hooks/use-context', () => ({ useAdenaContext: jest.fn() }));
jest.mock('@hooks/use-current-account', () => ({ useCurrentAccount: jest.fn() }));

const mockedUseQuery = useQuery as jest.Mock;

const TOKENS: Record<string, { symbol: string; decimals: number }> = {
  'atomone-1:uatone': { symbol: 'ATONE', decimals: 6 },
  'atomone-1:uphoton': { symbol: 'PHOTON', decimals: 6 },
};

const DOCUMENT = { chainId: 'atomone-1', msgs: [], memo: '' } as unknown as CosmosDocument;

const mockEstimate = (estimate: { feeDenom: string } | null): void => {
  mockedUseQuery.mockReturnValue({
    data: {
      estimate: estimate && { gasUsed: 100_000, minBaseGasPrice: '0.225', ...estimate },
      errorMessage: estimate ? null : 'simulate failed',
    },
    isFetched: true,
  });
};

beforeEach(() => {
  (useAdenaContext as jest.Mock).mockReturnValue({
    transactionService: {},
    chainRegistry: {
      getChainByChainId: () => ({ ...ATOMONE_CHAIN, chainId: 'atomone-1' }),
    },
    tokenRegistry: { get: (id: string) => TOKENS[id] },
  });
  (useCurrentAccount as jest.Mock).mockReturnValue({ currentAccount: { id: 'account' } });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('useCosmosNetworkFee', () => {
  // MintPhoton pays its fee in ATONE, so pricing it as PHOTON would misstate it.
  it('follows the fee denom the estimate resolved', () => {
    mockEstimate({ feeDenom: 'uatone' });

    const { result } = renderHook(() => useCosmosNetworkFee(DOCUMENT));

    expect(result.current.feeToken).toEqual({
      tokenId: 'atomone-1:uatone',
      networkId: 'atomone-1',
      decimals: 6,
    });
    expect(result.current.feeSymbol).toBe('ATONE');
    expect(result.current.networkFee?.denom).toBe('ATONE');
  });

  it('follows the fallback fee denom when the estimate fails', () => {
    mockEstimate(null);

    const { result } = renderHook(() => useCosmosNetworkFee(DOCUMENT));

    expect(result.current.feeToken?.tokenId).toBe('atomone-1:uphoton');
    expect(result.current.feeSymbol).toBe('PHOTON');
  });
});
