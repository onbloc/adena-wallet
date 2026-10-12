import { GnoSocialWalletProvider } from '@adena-wallet/sdk';
import { renderHook } from '@testing-library/react';

import { EMAIL_VERIFIERS, Web3AuthVerifier } from '@common/constants/web3auth.constant';
import useEmailLoginScreen from './use-email-login-screen';

// Stub out the SDK to avoid pulling in @web3auth's native crypto at test time.
jest.mock('@adena-wallet/sdk', () => ({
  GnoSocialWalletProvider: { createEmailPasswordless: jest.fn() },
}));

const mockParams: { doneQuestionnaire?: boolean; keySetType?: string; email?: string } | null = {};

jest.mock('@hooks/use-app-navigate', () => ({
  __esModule: true,
  default: (): unknown => ({ navigate: jest.fn(), params: mockParams }),
}));

jest.mock('@hooks/use-network', () => ({
  useNetwork: (): unknown => ({
    currentNetwork: { chainId: 'test', rpcUrl: '', addressPrefix: 'g' },
  }),
}));

jest.mock('@hooks/wallet/broadcast-transaction/use-indicator-step', () => ({
  __esModule: true,
  default: (): unknown => ({ stepNo: 0, stepLength: 2 }),
}));

jest.mock('../use-questionnaire', () => ({
  __esModule: true,
  default: (): unknown => ({ ableToSkipQuestionnaire: true }),
}));

const mockConnectWithProvider = jest.fn();

jest.mock('../social-login/use-social-login-account', () => ({
  __esModule: true,
  default: (): unknown => ({ connectWithProvider: mockConnectWithProvider }),
  toSocialLoginFailType: (): string => 'DEFAULT',
}));

const CONFIGURED: Web3AuthVerifier = {
  web3AuthClientId: 'client',
  web3AuthNetwork: 'mainnet',
  verifier: 'verifier',
};

const UNCONFIGURED: Web3AuthVerifier = {
  web3AuthClientId: '',
  web3AuthNetwork: 'mainnet',
  verifier: '',
};

const originalVerifiers = { ...EMAIL_VERIFIERS };

const setVerifiers = (production: Web3AuthVerifier, legacy = UNCONFIGURED): void => {
  EMAIL_VERIFIERS.PRODUCTION = production;
  EMAIL_VERIFIERS.LEGACY = legacy;
};

afterAll(() => {
  setVerifiers(originalVerifiers.PRODUCTION, originalVerifiers.LEGACY);
});

describe('useEmailLoginScreen popup ownership', () => {
  const createEmailPasswordless = GnoSocialWalletProvider.createEmailPasswordless as jest.Mock;

  beforeEach(() => {
    setVerifiers(CONFIGURED);
    mockConnectWithProvider.mockReset();
    createEmailPasswordless.mockReset();
    mockParams.doneQuestionnaire = true;
    mockParams.email = 'user@mail.com';
  });

  // `WebRouter` answers the browser's Back button by navigating Home, which
  // never reaches `backStep` — the screen just unmounts with the popup still
  // open. The attempt must not commit an account when it finally resolves.
  it('abandons a pending popup when the screen unmounts', async () => {
    let openPopup = (): void => undefined;
    createEmailPasswordless.mockReturnValue(
      new Promise((resolve) => {
        openPopup = (): void => resolve({});
      }),
    );

    const { result, unmount } = renderHook(() => useEmailLoginScreen());
    const pending = result.current.requestEmailLogin();

    unmount();
    openPopup();
    await pending;

    expect(mockConnectWithProvider).toHaveBeenCalledTimes(1);
    const isCurrentRequest = mockConnectWithProvider.mock.calls[0][2];
    expect(isCurrentRequest()).toBe(false);
  });

  it('keeps ownership while the screen is still mounted', async () => {
    createEmailPasswordless.mockResolvedValue({});

    const { result } = renderHook(() => useEmailLoginScreen());
    await result.current.requestEmailLogin();

    const isCurrentRequest = mockConnectWithProvider.mock.calls[0][2];
    expect(isCurrentRequest()).toBe(true);
  });
});

describe('useEmailLoginScreen entry state', () => {
  beforeEach(() => {
    setVerifiers(CONFIGURED);
    delete mockParams.doneQuestionnaire;
    delete mockParams.keySetType;
    delete mockParams.email;
  });

  it('fails up front when the verifier is unconfigured', () => {
    setVerifiers(UNCONFIGURED);

    const { result } = renderHook(() => useEmailLoginScreen());

    expect(result.current.emailLoginState).toBe('FAILED');
  });

  it('starts on the sensitive info step', () => {
    const { result } = renderHook(() => useEmailLoginScreen());

    expect(result.current.emailLoginState).toBe('INIT');
  });

  it('requests the login after the questionnaire when the address survived', () => {
    mockParams.doneQuestionnaire = true;
    mockParams.email = 'user@mail.com';

    const { result } = renderHook(() => useEmailLoginScreen());

    expect(result.current.emailLoginState).toBe('REQUEST_LOGIN');
    expect(result.current.email).toBe('user@mail.com');
  });

  it('asks for the address again when it did not survive the questionnaire', () => {
    mockParams.doneQuestionnaire = true;

    const { result } = renderHook(() => useEmailLoginScreen());

    // The address is the login hint, so the popup must not open without one.
    expect(result.current.emailLoginState).toBe('ENTER_EMAIL');
  });
});

describe('useEmailLoginScreen key set selection', () => {
  beforeEach(() => {
    delete mockParams.doneQuestionnaire;
    delete mockParams.keySetType;
    delete mockParams.email;
  });

  it('asks which key set to use when both verifiers are configured', () => {
    setVerifiers(CONFIGURED, CONFIGURED);

    const { result } = renderHook(() => useEmailLoginScreen());

    expect(result.current.emailLoginState).toBe('SELECT_KEY_SET');
    expect(result.current.ableToSelectProduction).toBe(true);
    expect(result.current.ableToSelectLegacy).toBe(true);
  });

  it('starts on the legacy verifier when production is the one missing', () => {
    setVerifiers(UNCONFIGURED, CONFIGURED);

    const { result } = renderHook(() => useEmailLoginScreen());

    expect(result.current.emailLoginState).toBe('INIT');
    expect(result.current.keySetType).toBe('LEGACY');
  });

  it('keeps the selected key set across the questionnaire round trip', () => {
    setVerifiers(CONFIGURED, CONFIGURED);
    mockParams.doneQuestionnaire = true;
    mockParams.keySetType = 'LEGACY';
    mockParams.email = 'user@mail.com';

    const { result } = renderHook(() => useEmailLoginScreen());

    expect(result.current.emailLoginState).toBe('REQUEST_LOGIN');
    expect(result.current.keySetType).toBe('LEGACY');
  });
});
