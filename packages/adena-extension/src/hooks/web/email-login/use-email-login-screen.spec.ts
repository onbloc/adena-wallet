import { renderHook } from '@testing-library/react';

import { EMAIL_VERIFIER } from '@common/constants/web3auth.constant';
import useEmailLoginScreen from './use-email-login-screen';

// Stub out the SDK to avoid pulling in @web3auth's native crypto at test time.
jest.mock('@adena-wallet/sdk', () => ({
  GnoSocialWalletProvider: { createEmailPasswordless: jest.fn() },
}));

const mockParams: { doneQuestionnaire?: boolean; email?: string } | null = {};

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

jest.mock('../social-login/use-social-login-account', () => ({
  __esModule: true,
  default: (): unknown => ({ connectWithProvider: jest.fn() }),
  toSocialLoginFailType: (): string => 'DEFAULT',
}));

const configured = { ...EMAIL_VERIFIER };

const setVerifier = (verifier: Partial<typeof EMAIL_VERIFIER>): void => {
  Object.assign(EMAIL_VERIFIER, configured, verifier);
};

describe('useEmailLoginScreen entry state', () => {
  beforeEach(() => {
    setVerifier({ web3AuthClientId: 'client', verifier: 'verifier' });
    delete mockParams.doneQuestionnaire;
    delete mockParams.email;
  });

  it('fails up front when the verifier is unconfigured', () => {
    setVerifier({ web3AuthClientId: '', verifier: '' });

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
