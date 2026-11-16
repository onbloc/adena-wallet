import { GnoSocialWalletProvider } from '@adena-wallet/sdk';
import { useCallback, useState } from 'react';

import { SocialKeySetType, X_VERIFIERS } from '@common/constants/web3auth.constant';
import {
  createXLoginConfig,
  getSocialKeySetAvailability,
  isVerifierConfigured,
} from '@common/utils/social-login';
import useAppNavigate from '@hooks/use-app-navigate';
import { useNetwork } from '@hooks/use-network';
import useIndicatorStep, {
  UseIndicatorStepReturn,
} from '@hooks/wallet/broadcast-transaction/use-indicator-step';
import { RoutePath } from '@types';
import useSocialLoginAccount, {
  SocialLoginFailType,
  toSocialLoginFailType,
} from '../social-login/use-social-login-account';
import useSocialLoginAttempt from '../social-login/use-social-login-attempt';
import useQuestionnaire from '../use-questionnaire';

export type UseXLoginReturn = {
  failType: SocialLoginFailType;
  ableToSelectProduction: boolean;
  ableToSelectLegacy: boolean;
  xLoginState: XLoginStateType;
  keySetType: SocialKeySetType;
  indicatorInfo: UseIndicatorStepReturn;
  selectKeySetType: (keySetType: SocialKeySetType) => void;
  initXLogin: () => void;
  backStep: () => void;
  retry: () => void;
  requestXLogin: () => Promise<void>;
};

export type XLoginStateType = 'SELECT_KEY_SET' | 'INIT' | 'REQUEST_LOGIN' | 'FAILED';

// SELECT_KEY_SET shares the indicator step with INIT so picking a key set does
// not add a step to the onboarding progress bar.
const xLoginStepNo: Record<XLoginStateType, number> = {
  SELECT_KEY_SET: 0,
  INIT: 0,
  REQUEST_LOGIN: 1,
  FAILED: 1,
};

const useXLoginScreen = (): UseXLoginReturn => {
  const { navigate, params } = useAppNavigate<RoutePath.WebXLogin>();
  const { ableToSkipQuestionnaire } = useQuestionnaire();
  const { connectWithProvider } = useSocialLoginAccount();
  // Restored from the route state after the questionnaire round trip, which
  // remounts this screen and would otherwise reset the selection.
  const { ableToSelectProduction, ableToSelectLegacy, ableToSelectKeySet, initialKeySetType } =
    getSocialKeySetAvailability(X_VERIFIERS, 'X', params?.keySetType);
  const [failType, setFailType] = useState<SocialLoginFailType>('DEFAULT');
  const { currentNetwork } = useNetwork();
  // Identifies the login attempt that owns the popup, so an abandoned or
  // superseded one cannot commit an account when it finally resolves.
  const { begin: beginAttempt, abandon: abandonAttempt } = useSocialLoginAttempt();

  const [xLoginState, setXLoginState] = useState<XLoginStateType>(() => {
    if (!params?.doneQuestionnaire && ableToSelectKeySet) {
      return 'SELECT_KEY_SET';
    }
    // Nothing to log in against when the verifier is unconfigured.
    if (!isVerifierConfigured(X_VERIFIERS[initialKeySetType], 'X')) {
      return 'FAILED';
    }
    return params?.doneQuestionnaire ? 'REQUEST_LOGIN' : 'INIT';
  });

  const [keySetType, setKeySetType] = useState<SocialKeySetType>(initialKeySetType);

  const indicatorInfo = useIndicatorStep<string>({
    stepMap: xLoginStepNo,
    currentState: xLoginState,
    hasQuestionnaire: true,
  });

  const selectKeySetType = useCallback((selected: SocialKeySetType) => {
    setKeySetType(selected);
    setXLoginState(isVerifierConfigured(X_VERIFIERS[selected], 'X') ? 'INIT' : 'FAILED');
  }, []);

  const initXLogin = useCallback(() => {
    if (ableToSkipQuestionnaire) {
      setXLoginState('REQUEST_LOGIN');
      return;
    }
    navigate(RoutePath.WebQuestionnaire, {
      state: {
        callbackPath: RoutePath.WebXLogin,
        callbackState: {
          keySetType,
        },
      },
    });
  }, [ableToSkipQuestionnaire, keySetType, navigate]);

  const requestXLogin = async (): Promise<void> => {
    const isCurrentRequest = beginAttempt();

    try {
      const provider = await GnoSocialWalletProvider.createTwitter(
        createXLoginConfig(X_VERIFIERS[keySetType], currentNetwork),
      );
      await connectWithProvider(provider, 'WEB3_AUTH_X', isCurrentRequest);
    } catch (e) {
      console.error(e);
      if (!isCurrentRequest()) {
        return;
      }
      setFailType(toSocialLoginFailType(e));
      setXLoginState('FAILED');
    }
  };

  const backStep = useCallback(() => {
    // Abandons whatever popup is still open.
    abandonAttempt();

    if (xLoginState === 'SELECT_KEY_SET') {
      navigate(RoutePath.WebAdvancedOption);
      return;
    }
    if (xLoginState === 'INIT' || !isVerifierConfigured(X_VERIFIERS[keySetType], 'X')) {
      if (!ableToSelectKeySet) {
        navigate(RoutePath.WebAdvancedOption);
        return;
      }
      setXLoginState('SELECT_KEY_SET');
      return;
    }
    setXLoginState('INIT');
  }, [abandonAttempt, xLoginState, keySetType, ableToSelectKeySet, navigate]);

  const retry = useCallback(() => {
    if (!isVerifierConfigured(X_VERIFIERS[keySetType], 'X')) {
      return;
    }
    setFailType('DEFAULT');
    setXLoginState('REQUEST_LOGIN');
  }, [keySetType]);

  return {
    failType,
    ableToSelectProduction,
    ableToSelectLegacy,
    xLoginState,
    keySetType,
    indicatorInfo,
    selectKeySetType,
    initXLogin,
    backStep,
    retry,
    requestXLogin,
  };
};

export default useXLoginScreen;
