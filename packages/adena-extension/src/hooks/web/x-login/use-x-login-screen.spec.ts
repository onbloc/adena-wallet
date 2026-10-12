import { renderHook } from '@testing-library/react';

import { Web3AuthVerifier, X_VERIFIERS } from '@common/constants/web3auth.constant';
import useXLoginScreen from './use-x-login-screen';

// Stub out the SDK to avoid pulling in @web3auth's native crypto at test time.
jest.mock('@adena-wallet/sdk', () => ({
  GnoSocialWalletProvider: { createTwitter: jest.fn() },
}));

const mockParams: { doneQuestionnaire?: boolean; keySetType?: string } = {};

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

const CONFIGURED: Web3AuthVerifier = {
  web3AuthClientId: 'client',
  web3AuthNetwork: 'mainnet',
  verifier: 'verifier',
  authClientId: 'auth-client',
  domain: 'auth0.example.com',
};

const UNCONFIGURED: Web3AuthVerifier = {
  web3AuthClientId: '',
  web3AuthNetwork: 'mainnet',
  verifier: '',
};

const setVerifiers = (production: Web3AuthVerifier, legacy: Web3AuthVerifier): void => {
  X_VERIFIERS.PRODUCTION = production;
  X_VERIFIERS.LEGACY = legacy;
};

describe('useXLoginScreen key set selection', () => {
  const production = { ...X_VERIFIERS.PRODUCTION };
  const legacy = { ...X_VERIFIERS.LEGACY };

  beforeEach(() => {
    delete mockParams.doneQuestionnaire;
    delete mockParams.keySetType;
  });

  afterEach(() => {
    setVerifiers(production, legacy);
  });

  it('asks which key set to use when both verifiers are configured', () => {
    setVerifiers(CONFIGURED, CONFIGURED);

    const { result } = renderHook(() => useXLoginScreen());

    expect(result.current.xLoginState).toBe('SELECT_KEY_SET');
    expect(result.current.ableToSelectProduction).toBe(true);
    expect(result.current.ableToSelectLegacy).toBe(true);
  });

  it('starts on the legacy verifier when production is the one missing', () => {
    setVerifiers(UNCONFIGURED, CONFIGURED);

    const { result } = renderHook(() => useXLoginScreen());

    expect(result.current.xLoginState).toBe('INIT');
    expect(result.current.keySetType).toBe('LEGACY');
  });

  it('starts on the production verifier when legacy is the one missing', () => {
    setVerifiers(CONFIGURED, UNCONFIGURED);

    const { result } = renderHook(() => useXLoginScreen());

    expect(result.current.xLoginState).toBe('INIT');
    expect(result.current.keySetType).toBe('PRODUCTION');
  });

  it('fails up front when neither verifier is configured', () => {
    setVerifiers(UNCONFIGURED, UNCONFIGURED);

    const { result } = renderHook(() => useXLoginScreen());

    expect(result.current.xLoginState).toBe('FAILED');
  });

  it('keeps the selected key set across the questionnaire round trip', () => {
    setVerifiers(CONFIGURED, CONFIGURED);
    mockParams.doneQuestionnaire = true;
    mockParams.keySetType = 'LEGACY';

    const { result } = renderHook(() => useXLoginScreen());

    expect(result.current.xLoginState).toBe('REQUEST_LOGIN');
    expect(result.current.keySetType).toBe('LEGACY');
  });
});
