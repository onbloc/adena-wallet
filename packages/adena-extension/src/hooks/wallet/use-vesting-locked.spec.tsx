import { renderHook } from '@testing-library/react';

import { parseVestingSchedule, VestingInfo } from '@common/utils/vesting-utils';
import { useChainBlockTime } from '@hooks/wallet/use-chain-block-time';
import { useVestingInfo } from '@hooks/wallet/use-vesting-info';

import { useVestingLocked } from './use-vesting-locked';

jest.mock('@hooks/wallet/use-vesting-info', () => ({
  useVestingInfo: jest.fn(),
}));
jest.mock('@hooks/wallet/use-chain-block-time', () => ({
  useChainBlockTime: jest.fn(),
}));

const mockedUseVestingInfo = useVestingInfo as jest.MockedFunction<typeof useVestingInfo>;
const mockedUseChainBlockTime = useChainBlockTime as jest.MockedFunction<typeof useChainBlockTime>;

const ADDRESS = 'g1manfred47kzduec920z88wfr64ylksmdcedlf5';

const START_TIME = 1_700_000_000;
const END_TIME = 1_700_000_100;

// 100 GNOT granted against a 110 GNOT balance, vesting linearly over 100s.
const vestingInfo = (): VestingInfo => {
  const schedule = parseVestingSchedule({
    original_vesting: '100000000ugnot',
    start_time: String(START_TIME),
    end_time: String(END_TIME),
  });

  if (!schedule) {
    throw new Error('fixture schedule must parse');
  }

  return { schedule, coins: '110000000ugnot' };
};

const setVestingInfo = (
  info: VestingInfo | null,
  overrides?: Partial<{
    isLoading: boolean;
    isResolved: boolean;
  }>,
): void => {
  mockedUseVestingInfo.mockReturnValue({
    vestingInfo: info,
    isLoading: overrides?.isLoading ?? false,
    isResolved: overrides?.isResolved ?? true,
  });
};

describe('useVestingLocked', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('reports the still-locked amount in display units', () => {
    setVestingInfo(vestingInfo());
    // Half way through the curve: 50 GNOT vested, 50 still locked.
    mockedUseChainBlockTime.mockReturnValue(START_TIME + 50);

    const { result } = renderHook(() => useVestingLocked(ADDRESS));

    expect(result.current.lockedAmount?.toFixed()).toBe('50');
    expect(result.current.isLoading).toBe(false);
  });

  it('locks nothing once the schedule has run out', () => {
    setVestingInfo(vestingInfo());
    mockedUseChainBlockTime.mockReturnValue(END_TIME);

    const { result } = renderHook(() => useVestingLocked(ADDRESS));

    expect(result.current.lockedAmount?.toFixed()).toBe('0');
  });

  it('leaves the balance uncapped for an account without a grant', () => {
    setVestingInfo(null);
    mockedUseChainBlockTime.mockReturnValue(START_TIME);

    const { result } = renderHook(() => useVestingLocked(ADDRESS));

    expect(result.current.lockedAmount).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  // An unread grant must not read as "no grant" — that is what would let MAX
  // offer locked coins.
  it('stays loading while the grant is in flight', () => {
    setVestingInfo(null, { isLoading: true });
    mockedUseChainBlockTime.mockReturnValue(START_TIME);

    const { result } = renderHook(() => useVestingLocked(ADDRESS));

    expect(result.current.lockedAmount).toBeNull();
    expect(result.current.isLoading).toBe(true);
  });

  // `getAccountInfo` answers a failed RPC with an IN_ACTIVE placeholder that
  // carries no grant, so an unresolved read must not uncap the send.
  it('stays loading when the account could not be read', () => {
    setVestingInfo(null, { isResolved: false });
    mockedUseChainBlockTime.mockReturnValue(START_TIME);

    const { result } = renderHook(() => useVestingLocked(ADDRESS));

    expect(result.current.lockedAmount).toBeNull();
    expect(result.current.isLoading).toBe(true);
  });

  // The device clock could run ahead of the chain and release coins early.
  it('stays loading until the chain block time has been read', () => {
    setVestingInfo(vestingInfo());
    mockedUseChainBlockTime.mockReturnValue(null);

    const { result } = renderHook(() => useVestingLocked(ADDRESS));

    expect(result.current.lockedAmount).toBeNull();
    expect(result.current.isLoading).toBe(true);
  });

  it('skips the lookup when disabled or without an address', () => {
    setVestingInfo(vestingInfo(), { isLoading: true });
    mockedUseChainBlockTime.mockReturnValue(START_TIME);

    const { result: disabled } = renderHook(() => useVestingLocked(ADDRESS, false));
    const { result: noAddress } = renderHook(() => useVestingLocked(null));

    expect(disabled.current).toEqual({ lockedAmount: null, isLoading: false });
    expect(noAddress.current).toEqual({ lockedAmount: null, isLoading: false });
    expect(mockedUseVestingInfo).toHaveBeenCalledWith(null);
  });
});
