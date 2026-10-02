import { renderHook } from '@testing-library/react';

import { GOOGLE_VERIFIERS, Web3AuthVerifier } from '@common/constants/web3auth.constant';
import useGoogleLoginScreen from './use-google-login-screen';

// Stub out the SDK to avoid pulling in @web3auth's native crypto at test time.
jest.mock('@adena-wallet/sdk', () => ({
  GnoSocialWalletProvider: { createGoogle: jest.fn() },
}));

jest.mock('@hooks/use-app-navigate', () => ({
  __esModule: true,
  default: (): unknown => ({ navigate: jest.fn(), params: null }),
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
  web3AuthNetwork: 'testnet',
  verifier: 'verifier',
  authClientId: 'auth-client',
};

const UNCONFIGURED: Web3AuthVerifier = {
  web3AuthClientId: '',
  web3AuthNetwork: 'mainnet',
  verifier: '',
};

const setVerifiers = (production: Web3AuthVerifier, legacy: Web3AuthVerifier): void => {
  GOOGLE_VERIFIERS.PRODUCTION = production;
  GOOGLE_VERIFIERS.LEGACY = legacy;
};

describe('useGoogleLoginScreen key set selection', () => {
  const production = { ...GOOGLE_VERIFIERS.PRODUCTION };
  const legacy = { ...GOOGLE_VERIFIERS.LEGACY };

  afterEach(() => {
    setVerifiers(production, legacy);
  });

  it('asks which key set to use when both verifiers are configured', () => {
    setVerifiers(CONFIGURED, CONFIGURED);

    const { result } = renderHook(() => useGoogleLoginScreen());

    expect(result.current.googleLoginState).toBe('SELECT_KEY_SET');
    expect(result.current.ableToSelectProduction).toBe(true);
    expect(result.current.ableToSelectLegacy).toBe(true);
  });

  it('starts on the legacy verifier when production is the one missing', () => {
    setVerifiers(UNCONFIGURED, CONFIGURED);

    const { result } = renderHook(() => useGoogleLoginScreen());

    // Skipping the selection must not leave the flow pointed at the verifier
    // that cannot sign in.
    expect(result.current.googleLoginState).toBe('INIT');
    expect(result.current.keySetType).toBe('LEGACY');
  });

  it('starts on the production verifier when legacy is the one missing', () => {
    setVerifiers(CONFIGURED, UNCONFIGURED);

    const { result } = renderHook(() => useGoogleLoginScreen());

    expect(result.current.googleLoginState).toBe('INIT');
    expect(result.current.keySetType).toBe('PRODUCTION');
  });

  it('fails up front when neither verifier is configured', () => {
    setVerifiers(UNCONFIGURED, UNCONFIGURED);

    const { result } = renderHook(() => useGoogleLoginScreen());

    expect(result.current.googleLoginState).toBe('FAILED');
  });
});
