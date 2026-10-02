import { renderHook, waitFor } from '@testing-library/react';
import { AdenaWallet, SingleAccount, Web3AuthKeyring } from 'adena-module';

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
const mockLoadWallet = jest.fn();
const mockUpdateWallet = jest.fn();
const mockChangeCurrentAccount = jest.fn();

jest.mock('@hooks/use-app-navigate', () => ({
  __esModule: true,
  default: (): unknown => ({ navigate: mockNavigate }),
}));

jest.mock('@hooks/use-context', () => ({
  useAdenaContext: (): unknown => ({
    walletService: { existsWallet: mockExistsWallet, loadWallet: mockLoadWallet },
  }),
  useWalletContext: (): unknown => ({ updateWallet: mockUpdateWallet }),
}));

jest.mock('@hooks/use-current-account', () => ({
  useCurrentAccount: (): unknown => ({ changeCurrentAccount: mockChangeCurrentAccount }),
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

describe('useSocialLoginAccount cancellation on the existing-wallet path', () => {
  const account = { id: 'new-account', publicKey: new Uint8Array(33), index: 0 };

  const makeClone = (): Record<string, unknown> => {
    const accounts: unknown[] = [];
    return {
      accounts,
      nextAccountName: 'Account 2',
      lastAccountIndex: 1,
      addAccount: jest.fn((added: unknown) => accounts.push(added)),
      addKeyring: jest.fn(),
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockExistsWallet.mockResolvedValue(true);
    (SingleAccount.createBy as jest.Mock).mockResolvedValue(account);
    (Web3AuthKeyring.fromPrivateKeyStr as jest.Mock).mockResolvedValue({ id: 'keyring' });
  });

  it('does not write to the wallet when the request is abandoned mid-flight', async () => {
    let releaseLoadWallet!: (wallet: unknown) => void;
    mockLoadWallet.mockReturnValue(
      new Promise((resolve) => {
        releaseLoadWallet = resolve;
      }),
    );

    const { result } = renderHook(() => useSocialLoginAccount());

    let isCurrent = true;
    const connecting = result.current.connectWithProvider(
      makeProvider() as never,
      'WEB3_AUTH_EMAIL',
      () => isCurrent,
    );

    await waitFor(() => expect(mockLoadWallet).toHaveBeenCalled());
    isCurrent = false;
    releaseLoadWallet({ clone: makeClone });
    await connecting;

    expect(mockUpdateWallet).not.toHaveBeenCalled();
    expect(mockChangeCurrentAccount).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not navigate when the request is abandoned while the switch is pending', async () => {
    mockLoadWallet.mockResolvedValue({ clone: makeClone });
    mockUpdateWallet.mockResolvedValue(undefined);

    let releaseSwitch!: () => void;
    mockChangeCurrentAccount.mockReturnValue(
      new Promise<void>((resolve) => {
        releaseSwitch = resolve;
      }),
    );

    const { result } = renderHook(() => useSocialLoginAccount());

    let isCurrent = true;
    const connecting = result.current.connectWithProvider(
      makeProvider() as never,
      'WEB3_AUTH_EMAIL',
      () => isCurrent,
    );

    await waitFor(() => expect(mockChangeCurrentAccount).toHaveBeenCalled());
    isCurrent = false;
    releaseSwitch();
    await connecting;

    // The wallet was already saved by this point, but a canceled login must not
    // take over the screen.
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('saves the wallet before switching the current account', async () => {
    const order: string[] = [];
    mockLoadWallet.mockResolvedValue({ clone: makeClone });
    mockUpdateWallet.mockImplementation(async () => {
      order.push('updateWallet');
    });
    mockChangeCurrentAccount.mockImplementation(async () => {
      order.push('changeCurrentAccount');
    });

    const { result } = renderHook(() => useSocialLoginAccount());

    await result.current.connectWithProvider(
      makeProvider() as never,
      'WEB3_AUTH_EMAIL',
      () => true,
    );

    // Switching first would leave the current account pointing at one the
    // wallet has not stored yet.
    expect(order).toEqual(['updateWallet', 'changeCurrentAccount']);
    expect(mockNavigate).toHaveBeenCalled();
  });
});
