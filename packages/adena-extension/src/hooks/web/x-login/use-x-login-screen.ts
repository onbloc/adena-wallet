import { GnoSocialWalletProvider } from '@adena-wallet/sdk';
import { useCallback, useRef, useState } from 'react';

import { X_VERIFIER } from '@common/constants/web3auth.constant';
import { createXLoginConfig, isVerifierConfigured } from '@common/utils/social-login';
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
import useQuestionnaire from '../use-questionnaire';

export type UseXLoginReturn = {
  failType: SocialLoginFailType;
  xLoginState: XLoginStateType;
  indicatorInfo: UseIndicatorStepReturn;
  initXLogin: () => void;
  backStep: () => void;
  retry: () => void;
  requestXLogin: () => Promise<void>;
};

export type XLoginStateType = 'INIT' | 'REQUEST_LOGIN' | 'FAILED';

const xLoginStepNo: Record<XLoginStateType, number> = {
  INIT: 0,
  REQUEST_LOGIN: 1,
  FAILED: 1,
};

const useXLoginScreen = (): UseXLoginReturn => {
  const { navigate, params } = useAppNavigate<RoutePath.WebXLogin>();
  const { ableToSkipQuestionnaire } = useQuestionnaire();
  const { connectWithProvider } = useSocialLoginAccount();
  const [failType, setFailType] = useState<SocialLoginFailType>('DEFAULT');
  const { currentNetwork } = useNetwork();
  // Identifies the login attempt that owns the popup, so a canceled or
  // superseded one cannot commit an account when it finally resolves.
  const requestIdRef = useRef(0);

  const [xLoginState, setXLoginState] = useState<XLoginStateType>(() => {
    // Nothing to log in against when the verifier is unconfigured.
    if (!isVerifierConfigured(X_VERIFIER, 'X')) {
      return 'FAILED';
    }
    return params?.doneQuestionnaire ? 'REQUEST_LOGIN' : 'INIT';
  });

  const indicatorInfo = useIndicatorStep<string>({
    stepMap: xLoginStepNo,
    currentState: xLoginState,
    hasQuestionnaire: true,
  });

  const initXLogin = useCallback(() => {
    if (ableToSkipQuestionnaire) {
      setXLoginState('REQUEST_LOGIN');
      return;
    }
    navigate(RoutePath.WebQuestionnaire, {
      state: {
        callbackPath: RoutePath.WebXLogin,
      },
    });
  }, [ableToSkipQuestionnaire, navigate]);

  const requestXLogin = async (): Promise<void> => {
    const requestId = (requestIdRef.current += 1);
    const isCurrentRequest = (): boolean => requestIdRef.current === requestId;

    try {
      const provider = await GnoSocialWalletProvider.createTwitter(
        createXLoginConfig(X_VERIFIER, currentNetwork),
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
    requestIdRef.current += 1;

    if (xLoginState === 'INIT' || !isVerifierConfigured(X_VERIFIER, 'X')) {
      navigate(RoutePath.WebAdvancedOption);
      return;
    }
    setXLoginState('INIT');
  }, [xLoginState, navigate]);

  const retry = useCallback(() => {
    if (!isVerifierConfigured(X_VERIFIER, 'X')) {
      return;
    }
    setFailType('DEFAULT');
    setXLoginState('REQUEST_LOGIN');
  }, []);

  return {
    failType,
    xLoginState,
    indicatorInfo,
    initXLogin,
    backStep,
    retry,
    requestXLogin,
  };
};

export default useXLoginScreen;
