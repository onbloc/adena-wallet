import IconGoogle from '@assets/web/icon-google';
import AnimationWaitForGoogleLogin from '@assets/web/lottie/waiting-for-google-login.json';
import React, { useCallback, useMemo } from 'react';

import { WebMain } from '@components/atoms';
import { WebMainHeader } from '@components/pages/web/main-header';
import useGoogleLoginScreen from '@hooks/web/google-login/use-google-login-screen';

import { ADENA_DOCS_PAGE } from '@common/constants/resource.constant';
import {
  WEB_SELECT_CONTENT_WIDTH,
  WEB_TOP_SPACING,
  WEB_TOP_SPACING_RESPONSIVE,
} from '@common/constants/ui.constant';
import SensitiveInfoStep from '@components/pages/web/sensitive-info-step';
import SocialLoginFail from '@components/pages/web/social-login-fail';
import SocialLoginRequest from '@components/pages/web/social-login-request';
import SocialLoginSelectKeySet, {
  SOCIAL_LOGIN_SENSITIVE_INFO_DESC,
} from '@components/pages/web/social-login-select-key-set';

const GoogleLoginScreen: React.FC = () => {
  const {
    googleLoginState,
    failType,
    ableToSelectProduction,
    ableToSelectLegacy,
    keySetType,
    indicatorInfo,
    backStep,
    retry,
    selectKeySetType,
    initGoogleLogin,
    requestGoogleLogin,
  } = useGoogleLoginScreen();

  // The key-set step is a provider picker like the other option lists, so it
  // keeps their narrower column instead of the wider one the later steps use.
  const contentWidth = useMemo(() => {
    return googleLoginState === 'SELECT_KEY_SET' ? WEB_SELECT_CONTENT_WIDTH : undefined;
  }, [googleLoginState]);

  const topSpacing = useMemo(() => {
    if (googleLoginState !== 'REQUEST_LOGIN') {
      return {
        default: WEB_TOP_SPACING,
        responsive: WEB_TOP_SPACING_RESPONSIVE,
      };
    }
    return null;
  }, [googleLoginState]);

  const onClickGoBack = useCallback(() => {
    backStep();
  }, [backStep]);

  return (
    <WebMain
      width={contentWidth}
      spacing={topSpacing?.default || null}
      responsiveSpacing={topSpacing?.responsive || null}
    >
      {googleLoginState !== 'REQUEST_LOGIN' && (
        <WebMainHeader
          stepLength={indicatorInfo.stepLength}
          currentStep={indicatorInfo.stepNo}
          onClickGoBack={onClickGoBack}
        />
      )}
      {googleLoginState === 'SELECT_KEY_SET' && (
        <SocialLoginSelectKeySet
          providerName='Google'
          providerIcon={<IconGoogle />}
          ableToSelectProduction={ableToSelectProduction}
          ableToSelectLegacy={ableToSelectLegacy}
          selectKeySetType={selectKeySetType}
        />
      )}
      {googleLoginState === 'INIT' && (
        <SensitiveInfoStep
          desc={SOCIAL_LOGIN_SENSITIVE_INFO_DESC[keySetType]}
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
