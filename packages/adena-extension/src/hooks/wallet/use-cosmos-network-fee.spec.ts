import { useQuery } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { CosmosDocument } from 'adena-module';
import type { Mock } from 'vitest';

import { ATOMONE_CHAIN } from '@common/utils/chain-utils';
import { useAdenaContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';

import { useCosmosNetworkFee } from './use-cosmos-network-fee';

vi.mock('@tanstack/react-query', () => ({ useQuery: vi.fn() }));
vi.mock('@hooks/use-context', () => ({ useAdenaContext: vi.fn() }));
vi.mock('@hooks/use-current-account', () => ({ useCurrentAccount: vi.fn() }));

const mockedUseQuery = useQuery as Mock;

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
  (useAdenaContext as Mock).mockReturnValue({
    transactionService: {},
    chainRegistry: {
      getChainByChainId: () => ({ ...ATOMONE_CHAIN, chainId: 'atomone-1' }),
    },
    tokenRegistry: { get: (id: string) => TOKENS[id] },
  });
  (useCurrentAccount as Mock).mockReturnValue({ currentAccount: { id: 'account' } });
});

afterEach(() => {
  vi.clearAllMocks();
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
