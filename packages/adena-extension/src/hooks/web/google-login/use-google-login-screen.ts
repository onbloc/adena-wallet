import { GnoSocialWalletProvider } from '@adena-wallet/sdk';
import { useCallback, useState } from 'react';

import { GOOGLE_VERIFIERS, SocialKeySetType } from '@common/constants/web3auth.constant';
import {
  createGoogleLoginConfig,
  getSocialKeySetAvailability,
  isVerifierConfigured,
} from '@common/utils/social-login';
import { useNetwork } from '@hooks/use-network';
import useAppNavigate from '@hooks/use-app-navigate';
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

export type UseGoogleLoginReturn = {
  failType: SocialLoginFailType;
  ableToSelectProduction: boolean;
  ableToSelectLegacy: boolean;
  googleLoginState: GoogleLoginStateType;
  keySetType: SocialKeySetType;
  indicatorInfo: UseIndicatorStepReturn;
  backStep: () => void;
  retry: () => void;
  selectKeySetType: (keySetType: SocialKeySetType) => void;
  initGoogleLogin: () => void;
  requestGoogleLogin: () => Promise<void>;
};

export type GoogleLoginStateType = 'SELECT_KEY_SET' | 'INIT' | 'REQUEST_LOGIN' | 'FAILED';

// SELECT_KEY_SET shares the indicator step with INIT so picking a key set does
// not add a step to the onboarding progress bar.
const googleLoginStepNo: Record<GoogleLoginStateType, number> = {
  SELECT_KEY_SET: 0,
  INIT: 0,
  REQUEST_LOGIN: 1,
  FAILED: 1,
};

const useGoogleLoginScreen = (): UseGoogleLoginReturn => {
  const { navigate, params } = useAppNavigate<RoutePath.WebGoogleLogin>();
  const { ableToSkipQuestionnaire } = useQuestionnaire();
  const { connectWithProvider } = useSocialLoginAccount();
  // Restored from the route state after the questionnaire round trip, which
  // remounts this screen and would otherwise reset the selection.
  const { ableToSelectProduction, ableToSelectLegacy, ableToSelectKeySet, initialKeySetType } =
    getSocialKeySetAvailability(GOOGLE_VERIFIERS, 'GOOGLE', params?.keySetType);
  // Identifies the login attempt that owns the popup, so an abandoned or
  // superseded one cannot commit an account when it finally resolves.
  const { begin: beginAttempt, abandon: abandonAttempt } = useSocialLoginAttempt();
  const [failType, setFailType] = useState<SocialLoginFailType>('DEFAULT');
  const { currentNetwork } = useNetwork();

  const [googleLoginState, setGoogleLoginState] = useState<GoogleLoginStateType>(() => {
    if (!params?.doneQuestionnaire && ableToSelectKeySet) {
      return 'SELECT_KEY_SET';
    }
    // Fail before opening the popup when the key set is unconfigured.
    if (!isVerifierConfigured(GOOGLE_VERIFIERS[initialKeySetType], 'GOOGLE')) {
      return 'FAILED';
    }
    return params?.doneQuestionnaire ? 'REQUEST_LOGIN' : 'INIT';
  });

  const [keySetType, setKeySetType] = useState<SocialKeySetType>(initialKeySetType);

  const indicatorInfo = useIndicatorStep<string>({
    stepMap: googleLoginStepNo,
    currentState: googleLoginState,
    hasQuestionnaire: true,
  });

  const selectKeySetType = useCallback((selected: SocialKeySetType) => {
    setKeySetType(selected);
    setGoogleLoginState(
      isVerifierConfigured(GOOGLE_VERIFIERS[selected], 'GOOGLE') ? 'INIT' : 'FAILED',
    );
  }, []);

  const initGoogleLogin = useCallback(() => {
    if (ableToSkipQuestionnaire) {
      setGoogleLoginState('REQUEST_LOGIN');
      return;
    }
    navigate(RoutePath.WebQuestionnaire, {
      state: {
        callbackPath: RoutePath.WebGoogleLogin,
        callbackState: {
          keySetType,
        },
      },
    });
  }, [ableToSkipQuestionnaire, keySetType]);

  const requestGoogleLogin = async (): Promise<void> => {
    const isCurrentRequest = beginAttempt();

    try {
      const provider = await GnoSocialWalletProvider.createGoogle(
        createGoogleLoginConfig(GOOGLE_VERIFIERS[keySetType], currentNetwork),
      );
      await connectWithProvider(provider, 'WEB3_AUTH', isCurrentRequest);
    } catch (e) {
      console.error(e);
      if (!isCurrentRequest()) {
        return;
      }
      setFailType(toSocialLoginFailType(e));
      setGoogleLoginState('FAILED');
    }
  };

  const backStep = useCallback(() => {
    // Abandons whatever popup is still open.
    abandonAttempt();

    if (googleLoginState === 'SELECT_KEY_SET') {
      navigate(RoutePath.WebAdvancedOption);
      return;
    }
    if (
      googleLoginState === 'INIT' ||
      !isVerifierConfigured(GOOGLE_VERIFIERS[keySetType], 'GOOGLE')
    ) {
      if (!ableToSelectKeySet) {
        navigate(RoutePath.WebAdvancedOption);
        return;
      }
      setGoogleLoginState('SELECT_KEY_SET');
      return;
    }
    setGoogleLoginState('INIT');
  }, [abandonAttempt, googleLoginState, keySetType, ableToSelectKeySet, navigate]);

  const retry = useCallback(() => {
    if (!isVerifierConfigured(GOOGLE_VERIFIERS[keySetType], 'GOOGLE')) {
      return;
    }
    setFailType('DEFAULT');
    setGoogleLoginState('REQUEST_LOGIN');
  }, [keySetType]);

  return {
    failType,
    ableToSelectProduction,
    ableToSelectLegacy,
    googleLoginState,
    keySetType,
    indicatorInfo,
    backStep,
    retry,
    selectKeySetType,
    initGoogleLogin,
    requestGoogleLogin,
  };
};

export default useGoogleLoginScreen;
