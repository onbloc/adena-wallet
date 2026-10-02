import { renderHook, waitFor } from '@testing-library/react';
import { AdenaWallet } from 'adena-module';

import { pendingWalletStore } from '@services/wallet/pending-wallet-store';
import useSocialLoginAccount from './use-social-login-account';

// Stub out the SDK to avoid pulling in @web3auth's native crypto at test time.
jest.mock('@adena-wallet/sdk', () => ({}));

jest.mock('adena-module', () => ({
  AdenaWallet: { createByWeb3Auth: jest.fn() },
  Web3AuthKeyring: { fromPrivateKeyStr: jest.fn() },
  SingleAccount: { createBy: jest.fn() },
  arrayToHex: jest.fn(() => 'hex'),
}));

jest.mock('@common/utils/social-login', () => ({
  requestSocialPrivateKey: jest.fn(async () => 'private-key'),
}));

jest.mock('@services/wallet/pending-wallet-store', () => ({
  pendingWalletStore: { set: jest.fn() },
}));

const mockNavigate = jest.fn();
const mockExistsWallet = jest.fn();

jest.mock('@hooks/use-app-navigate', () => ({
  __esModule: true,
  default: (): unknown => ({ navigate: mockNavigate }),
}));

jest.mock('@hooks/use-context', () => ({
  useAdenaContext: (): unknown => ({ walletService: { existsWallet: mockExistsWallet } }),
  useWalletContext: (): unknown => ({ updateWallet: jest.fn() }),
}));

jest.mock('@hooks/use-current-account', () => ({
  useCurrentAccount: (): unknown => ({ changeCurrentAccount: jest.fn() }),
}));

const createByWeb3AuthMock = AdenaWallet.createByWeb3Auth as jest.Mock;
const pendingWalletSetMock = pendingWalletStore.set as jest.Mock;

const makeProvider = (): unknown => ({
  connect: jest.fn(async () => true),
  disconnect: jest.fn(async () => true),
});

describe('useSocialLoginAccount cancellation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not create a wallet when the request is abandoned mid-flight', async () => {
    // Hold the wallet lookup open so the request can be canceled while the
    // account path is already running.
    let releaseExistsWallet!: (exists: boolean) => void;
    mockExistsWallet.mockReturnValue(
      new Promise<boolean>((resolve) => {
        releaseExistsWallet = resolve;
      }),
    );

    const { result } = renderHook(() => useSocialLoginAccount());

    let isCurrent = true;
    const connecting = result.current.connectWithProvider(
      makeProvider() as never,
      'WEB3_AUTH_EMAIL',
      () => isCurrent,
    );

    // Cancel only once the account path is past the earlier guards and waiting
    // on the wallet lookup - that is the window the guard has to cover.
    await waitFor(() => expect(mockExistsWallet).toHaveBeenCalled());
    isCurrent = false;
    releaseExistsWallet(false);
    await connecting;

    expect(createByWeb3AuthMock).not.toHaveBeenCalled();
    expect(pendingWalletSetMock).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('creates the wallet when the request is still current', async () => {
    mockExistsWallet.mockResolvedValue(false);
    createByWeb3AuthMock.mockResolvedValue({ destroy: jest.fn() });

    const { result } = renderHook(() => useSocialLoginAccount());

    await result.current.connectWithProvider(
      makeProvider() as never,
      'WEB3_AUTH_EMAIL',
      () => true,
    );

    expect(createByWeb3AuthMock).toHaveBeenCalledWith('private-key', 'WEB3_AUTH_EMAIL');
    expect(pendingWalletSetMock).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalled();
  });
});
