import { GnoSocialWalletProvider } from '@adena-wallet/sdk';
import { useCallback, useRef, useState } from 'react';

import {
  DEFAULT_GOOGLE_KEY_SET_TYPE,
  GOOGLE_VERIFIERS,
  GoogleKeySetType,
} from '@common/constants/web3auth.constant';
import { createGoogleLoginConfig, isVerifierConfigured } from '@common/utils/social-login';
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
import useQuestionnaire from '../use-questionnaire';

export type UseGoogleLoginReturn = {
  failType: SocialLoginFailType;
  ableToSelectProduction: boolean;
  ableToSelectLegacy: boolean;
  googleLoginState: GoogleLoginStateType;
  keySetType: GoogleKeySetType;
  indicatorInfo: UseIndicatorStepReturn;
  backStep: () => void;
  retry: () => void;
  selectKeySetType: (keySetType: GoogleKeySetType) => void;
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
  const ableToSelectProduction = isVerifierConfigured(GOOGLE_VERIFIERS.PRODUCTION, 'GOOGLE');
  const ableToSelectLegacy = isVerifierConfigured(GOOGLE_VERIFIERS.LEGACY, 'GOOGLE');
  // Only worth asking when both are available.
  const ableToSelectKeySet = ableToSelectProduction && ableToSelectLegacy;
  // Identifies the login attempt that owns the popup, so a canceled or
  // superseded one cannot commit an account when it finally resolves.
  const requestIdRef = useRef(0);
  const [failType, setFailType] = useState<SocialLoginFailType>('DEFAULT');
  const { currentNetwork } = useNetwork();

  const [googleLoginState, setGoogleLoginState] = useState<GoogleLoginStateType>(() => {
    if (!params?.doneQuestionnaire) {
      // Nothing to choose between when the legacy verifier is not configured.
      return ableToSelectKeySet ? 'SELECT_KEY_SET' : 'INIT';
    }
    // Fail before reopening the popup when the key set is unconfigured.
    return isVerifierConfigured(
      GOOGLE_VERIFIERS[params.keySetType || DEFAULT_GOOGLE_KEY_SET_TYPE],
      'GOOGLE',
    )
      ? 'REQUEST_LOGIN'
      : 'FAILED';
  });

  // Restored from the route state after the questionnaire round trip, which
  // remounts this screen and would otherwise reset the selection.
  const [keySetType, setKeySetType] = useState<GoogleKeySetType>(
    params?.keySetType || DEFAULT_GOOGLE_KEY_SET_TYPE,
  );

  const indicatorInfo = useIndicatorStep<string>({
    stepMap: googleLoginStepNo,
    currentState: googleLoginState,
    hasQuestionnaire: true,
  });

  const selectKeySetType = useCallback((selected: GoogleKeySetType) => {
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
    const requestId = (requestIdRef.current += 1);
    const isCurrentRequest = (): boolean => requestIdRef.current === requestId;

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
    requestIdRef.current += 1;

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
  }, [googleLoginState, keySetType, ableToSelectKeySet, navigate]);

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
