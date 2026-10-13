import { GnoSocialWalletProvider } from '@adena-wallet/sdk';
import { useCallback, useMemo, useState } from 'react';

import { EMAIL_VERIFIERS, SocialKeySetType } from '@common/constants/web3auth.constant';
import {
  createEmailLoginConfig,
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

export type UseEmailLoginReturn = {
  failType: SocialLoginFailType;
  ableToSelectProduction: boolean;
  ableToSelectLegacy: boolean;
  emailLoginState: EmailLoginStateType;
  keySetType: SocialKeySetType;
  email: string;
  ableToConfirmEmail: boolean;
  indicatorInfo: UseIndicatorStepReturn;
  selectKeySetType: (keySetType: SocialKeySetType) => void;
  initEmailLogin: () => void;
  changeEmail: (email: string) => void;
  confirmEmail: () => void;
  backStep: () => void;
  retry: () => void;
  requestEmailLogin: () => Promise<void>;
};

export type EmailLoginStateType =
  | 'SELECT_KEY_SET'
  | 'INIT'
  | 'ENTER_EMAIL'
  | 'REQUEST_LOGIN'
  | 'FAILED';

// SELECT_KEY_SET shares the indicator step with INIT so picking a key set does
// not add a step to the onboarding progress bar.
const emailLoginStepNo: Record<EmailLoginStateType, number> = {
  SELECT_KEY_SET: 0,
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
  // Restored from the route state after the questionnaire round trip, which
  // remounts this screen and would otherwise reset the selection.
  const { ableToSelectProduction, ableToSelectLegacy, ableToSelectKeySet, initialKeySetType } =
    getSocialKeySetAvailability(EMAIL_VERIFIERS, 'EMAIL', params?.keySetType);
  const [failType, setFailType] = useState<SocialLoginFailType>('DEFAULT');
  const { currentNetwork } = useNetwork();
  // Identifies the login attempt that owns the popup, so an abandoned or
  // superseded one cannot commit an account when it finally resolves.
  const { begin: beginAttempt, abandon: abandonAttempt } = useSocialLoginAttempt();

  const [emailLoginState, setEmailLoginState] = useState<EmailLoginStateType>(() => {
    if (!params?.doneQuestionnaire && ableToSelectKeySet) {
      return 'SELECT_KEY_SET';
    }
    // Nothing to log in against when the verifier is unconfigured.
    if (!isVerifierConfigured(EMAIL_VERIFIERS[initialKeySetType], 'EMAIL')) {
      return 'FAILED';
    }
    if (!params?.doneQuestionnaire) {
      return 'INIT';
    }
    // The address is the login hint, so never open the popup without one.
    return params.email ? 'REQUEST_LOGIN' : 'ENTER_EMAIL';
  });

  // Restored from the route state after the questionnaire round trip, which
  // remounts this screen and would otherwise lose the address the user typed.
  const [email, setEmail] = useState(params?.email || '');

  const [keySetType, setKeySetType] = useState<SocialKeySetType>(initialKeySetType);

  const indicatorInfo = useIndicatorStep<string>({
    stepMap: emailLoginStepNo,
    currentState: emailLoginState,
    hasQuestionnaire: true,
  });

  const ableToConfirmEmail = useMemo(() => EMAIL_PATTERN.test(email.trim()), [email]);

  const selectKeySetType = useCallback((selected: SocialKeySetType) => {
    setKeySetType(selected);
    setEmailLoginState(
      isVerifierConfigured(EMAIL_VERIFIERS[selected], 'EMAIL') ? 'INIT' : 'FAILED',
    );
  }, []);

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
          keySetType,
          email: email.trim(),
        },
      },
    });
  }, [ableToConfirmEmail, ableToSkipQuestionnaire, keySetType, email, navigate]);

  const requestEmailLogin = async (): Promise<void> => {
    const isCurrentRequest = beginAttempt();

    try {
      const provider = await GnoSocialWalletProvider.createEmailPasswordless(
        createEmailLoginConfig(EMAIL_VERIFIERS[keySetType], currentNetwork, email.trim()),
      );
      await connectWithProvider(provider, 'WEB3_AUTH_EMAIL', isCurrentRequest);
    } catch (e) {
      console.error(e);
      if (!isCurrentRequest()) {
        return;
      }
      setFailType(toSocialLoginFailType(e));
      setEmailLoginState('FAILED');
    }
  };

  const backStep = useCallback(() => {
    // Abandons whatever popup is still open.
    abandonAttempt();

    if (emailLoginState === 'SELECT_KEY_SET') {
      navigate(RoutePath.WebAdvancedOption);
      return;
    }
    if (emailLoginState === 'INIT' || !isVerifierConfigured(EMAIL_VERIFIERS[keySetType], 'EMAIL')) {
      if (!ableToSelectKeySet) {
        navigate(RoutePath.WebAdvancedOption);
        return;
      }
      setEmailLoginState('SELECT_KEY_SET');
      return;
    }
    if (emailLoginState === 'ENTER_EMAIL') {
      setEmailLoginState('INIT');
      return;
    }
    setEmailLoginState('ENTER_EMAIL');
  }, [abandonAttempt, emailLoginState, keySetType, ableToSelectKeySet, navigate]);

  const retry = useCallback(() => {
    if (!isVerifierConfigured(EMAIL_VERIFIERS[keySetType], 'EMAIL')) {
      return;
    }
    setFailType('DEFAULT');
    setEmailLoginState('REQUEST_LOGIN');
  }, [keySetType]);

  return {
    failType,
    ableToSelectProduction,
    ableToSelectLegacy,
    emailLoginState,
    keySetType,
    email,
    ableToConfirmEmail,
    indicatorInfo,
    selectKeySetType,
    initEmailLogin,
    changeEmail,
    confirmEmail,
    backStep,
    retry,
    requestEmailLogin,
  };
};

export default useEmailLoginScreen;
