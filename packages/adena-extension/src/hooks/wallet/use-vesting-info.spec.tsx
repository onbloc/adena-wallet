import { renderHook } from '@testing-library/react';

import { AccountInfo } from '@common/provider/gno';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useGetAccountInfo } from '@hooks/wallet/use-get-account-info';

import { useVestingInfo } from './use-vesting-info';

jest.mock('@hooks/use-current-account', () => ({
  useCurrentAccount: jest.fn(),
}));
jest.mock('@hooks/wallet/use-get-account-info', () => ({
  useGetAccountInfo: jest.fn(),
}));

const mockedUseCurrentAccount = useCurrentAccount as jest.MockedFunction<typeof useCurrentAccount>;
const mockedUseGetAccountInfo = useGetAccountInfo as jest.MockedFunction<typeof useGetAccountInfo>;

const ACCOUNT_A = 'g1manfred47kzduec920z88wfr64ylksmdcedlf5';
const ACCOUNT_B = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';

const accountInfo = (address: string, withVesting: boolean): AccountInfo => ({
  address,
  coins: '110294549738ugnot',
  chainId: 'test5',
  status: 'ACTIVE',
  publicKey: null,
  accountNumber: '1',
  sequence: '1',
  vesting: withVesting
    ? {
        original_vesting: '106560000000ugnot',
        start_time: '1789225200',
        end_time: '1852383600',
      }
    : undefined,
});

const setCurrentAddress = (address: string | null): void => {
  mockedUseCurrentAccount.mockReturnValue({
    currentBalanceAddress: address,
  } as unknown as ReturnType<typeof useCurrentAccount>);
};

const setAccountInfo = (data: AccountInfo | null): void => {
  mockedUseGetAccountInfo.mockReturnValue({
    data,
    isLoading: false,
  } as unknown as ReturnType<typeof useGetAccountInfo>);
};

describe('useVestingInfo', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns the grant of the account on screen', () => {
    setCurrentAddress(ACCOUNT_A);
    setAccountInfo(accountInfo(ACCOUNT_A, true));

    const { result } = renderHook(() => useVestingInfo());

    expect(result.current.vestingInfo?.schedule.originalVesting.toFixed()).toBe('106560000000');
    expect(result.current.vestingInfo?.coins).toBe('110294549738ugnot');
  });

  it('returns null for an account without a grant', () => {
    setCurrentAddress(ACCOUNT_A);
    setAccountInfo(accountInfo(ACCOUNT_A, false));

    const { result } = renderHook(() => useVestingInfo());

    expect(result.current.vestingInfo).toBeNull();
  });

  // Switching accounts must not leave the previous account's grant (and coins)
  // on screen while the new account's request is still in flight — the main
  // balance switches independently, so the panel would be splitting one
  // account's balance by another account's schedule.
  it('drops a grant left over from the previously selected account', () => {
    setCurrentAddress(ACCOUNT_B);
    setAccountInfo(accountInfo(ACCOUNT_A, true));

    const { result } = renderHook(() => useVestingInfo());

    expect(result.current.vestingInfo).toBeNull();
  });

  it('asks the account-info query not to carry data across accounts', () => {
    setCurrentAddress(ACCOUNT_A);
    setAccountInfo(accountInfo(ACCOUNT_A, true));

    renderHook(() => useVestingInfo());

    expect(mockedUseGetAccountInfo).toHaveBeenCalledWith(
      ACCOUNT_A,
      expect.objectContaining({ keepPreviousData: false }),
    );
  });

  it('returns null before any account is selected', () => {
    setCurrentAddress(null);
    setAccountInfo(null);

    const { result } = renderHook(() => useVestingInfo());

    expect(result.current.vestingInfo).toBeNull();
  });
});
