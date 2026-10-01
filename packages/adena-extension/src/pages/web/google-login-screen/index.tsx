import AnimationWaitForGoogleLogin from '@assets/web/lottie/waiting-for-google-login.json';
import React, { useCallback, useMemo } from 'react';

import { WebMain } from '@components/atoms';
import { WebMainHeader } from '@components/pages/web/main-header';
import useGoogleLoginScreen from '@hooks/web/google-login/use-google-login-screen';

import { ADENA_DOCS_PAGE } from '@common/constants/resource.constant';
import { WEB_TOP_SPACING, WEB_TOP_SPACING_RESPONSIVE } from '@common/constants/ui.constant';
import SensitiveInfoStep from '@components/pages/web/sensitive-info-step';
import SocialLoginFail from '@components/pages/web/social-login-fail';
import SocialLoginRequest from '@components/pages/web/social-login-request';
import GoogleLoginSelectKeySet from './select-key-set';

const GoogleLoginScreen: React.FC = () => {
  const {
    googleLoginState,
    failType,
    keySetType,
    indicatorInfo,
    backStep,
    retry,
    selectKeySetType,
    initGoogleLogin,
    requestGoogleLogin,
  } = useGoogleLoginScreen();

  const topSpacing = useMemo(() => {
    if (googleLoginState === 'SELECT_KEY_SET' || googleLoginState === 'INIT') {
      return {
        default: WEB_TOP_SPACING,
        responsive: WEB_TOP_SPACING_RESPONSIVE,
      };
    }
    return null;
  }, [googleLoginState]);

  const sensitiveInfoDesc = useMemo(() => {
    if (keySetType === 'LEGACY') {
      return 'You are about to construct a private key on your device using Web3Auth,\na third party service provider, with the previous verifier. This account\nwill be accessible with your social logins.';
    }
    return 'You are about to construct a private key on your device using Web3Auth,\na third party service provider. This account will be accessible with your\nsocial logins.';
  }, [keySetType]);

  const onClickGoBack = useCallback(() => {
    backStep();
  }, [backStep]);

  return (
    <WebMain
      spacing={topSpacing?.default || null}
      responsiveSpacing={topSpacing?.responsive || null}
    >
      {(googleLoginState === 'SELECT_KEY_SET' || googleLoginState === 'INIT') && (
        <WebMainHeader
          stepLength={indicatorInfo.stepLength}
          currentStep={indicatorInfo.stepNo}
          onClickGoBack={onClickGoBack}
        />
      )}
      {googleLoginState === 'SELECT_KEY_SET' && (
        <GoogleLoginSelectKeySet selectKeySetType={selectKeySetType} />
      )}
      {googleLoginState === 'INIT' && (
        <SensitiveInfoStep
          desc={sensitiveInfoDesc}
          onClickNext={initGoogleLogin}
          link={`${ADENA_DOCS_PAGE}/user-guide/sign-in/sign-in-with-google`}
        />
      )}
      {googleLoginState === 'REQUEST_LOGIN' && (
        <SocialLoginRequest
          title='Waiting for Google Login'
          description={'Complete your login by signing in with a Google\naccount in your browser. '}
          animationData={AnimationWaitForGoogleLogin}
          requestLogin={requestGoogleLogin}
          cancelLogin={backStep}
        />
      )}
      {googleLoginState === 'FAILED' && (
        <SocialLoginFail providerName='Google' failType={failType} retry={retry} />
      )}
    </WebMain>
  );
};

export default GoogleLoginScreen;
