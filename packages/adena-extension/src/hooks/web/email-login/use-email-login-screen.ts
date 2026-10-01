import { GnoSocialWalletProvider } from '@adena-wallet/sdk';
import { useCallback, useMemo, useState } from 'react';

import { EMAIL_VERIFIER } from '@common/constants/web3auth.constant';
import { createEmailLoginConfig, isVerifierConfigured } from '@common/utils/social-login';
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

export type UseEmailLoginReturn = {
  failType: SocialLoginFailType;
  emailLoginState: EmailLoginStateType;
  email: string;
  ableToConfirmEmail: boolean;
  indicatorInfo: UseIndicatorStepReturn;
  initEmailLogin: () => void;
  changeEmail: (email: string) => void;
  confirmEmail: () => void;
  backStep: () => void;
  retry: () => void;
  requestEmailLogin: () => Promise<void>;
};

export type EmailLoginStateType = 'INIT' | 'ENTER_EMAIL' | 'REQUEST_LOGIN' | 'FAILED';

const emailLoginStepNo: Record<EmailLoginStateType, number> = {
  INIT: 0,
  ENTER_EMAIL: 0,
  REQUEST_LOGIN: 1,
  FAILED: 1,
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const useEmailLoginScreen = (): UseEmailLoginReturn => {
  const { navigate, params } = useAppNavigate<RoutePath.WebEmailLogin>();
  const { ableToSkipQuestionnaire } = useQuestionnaire();
  const { connectWithProvider } = useSocialLoginAccount();
  const [failType, setFailType] = useState<SocialLoginFailType>('DEFAULT');
  const { currentNetwork } = useNetwork();

  const [emailLoginState, setEmailLoginState] = useState<EmailLoginStateType>(() => {
    // Nothing to log in against when the verifier is unconfigured.
    if (!isVerifierConfigured(EMAIL_VERIFIER)) {
      return 'FAILED';
    }
    return params?.doneQuestionnaire ? 'REQUEST_LOGIN' : 'INIT';
  });

  // Restored from the route state after the questionnaire round trip, which
  // remounts this screen and would otherwise lose the address the user typed.
  const [email, setEmail] = useState(params?.email || '');

  const indicatorInfo = useIndicatorStep<string>({
    stepMap: emailLoginStepNo,
    currentState: emailLoginState,
    hasQuestionnaire: true,
  });

  const ableToConfirmEmail = useMemo(() => EMAIL_PATTERN.test(email.trim()), [email]);

  const initEmailLogin = useCallback(() => {
    setEmailLoginState('ENTER_EMAIL');
  }, []);

  const changeEmail = useCallback((changed: string) => {
    setEmail(changed);
  }, []);

  const confirmEmail = useCallback(() => {
    if (!ableToConfirmEmail) {
      return;
    }
    if (ableToSkipQuestionnaire) {
      setEmailLoginState('REQUEST_LOGIN');
      return;
    }
    navigate(RoutePath.WebQuestionnaire, {
      state: {
        callbackPath: RoutePath.WebEmailLogin,
        callbackState: {
          email: email.trim(),
        },
      },
    });
  }, [ableToConfirmEmail, ableToSkipQuestionnaire, email, navigate]);

  const requestEmailLogin = async (): Promise<void> => {
    try {
      const provider = await GnoSocialWalletProvider.createEmailPasswordless(
        createEmailLoginConfig(EMAIL_VERIFIER, currentNetwork, email.trim()),
      );
      await connectWithProvider(provider, 'WEB3_AUTH_EMAIL');
    } catch (e) {
      console.error(e);
      setFailType(toSocialLoginFailType(e));
      setEmailLoginState('FAILED');
    }
  };

  const backStep = useCallback(() => {
    if (emailLoginState === 'INIT') {
      navigate(RoutePath.WebAdvancedOption);
      return;
    }
    if (emailLoginState === 'ENTER_EMAIL') {
      setEmailLoginState('INIT');
      return;
    }
    setEmailLoginState('ENTER_EMAIL');
  }, [emailLoginState, navigate]);

  const retry = useCallback(() => {
    if (!isVerifierConfigured(EMAIL_VERIFIER)) {
      return;
    }
    setFailType('DEFAULT');
    setEmailLoginState('REQUEST_LOGIN');
  }, []);

  return {
    failType,
    emailLoginState,
    email,
    ableToConfirmEmail,
    indicatorInfo,
    initEmailLogin,
    changeEmail,
    confirmEmail,
    backStep,
    retry,
    requestEmailLogin,
  };
};

export default useEmailLoginScreen;
