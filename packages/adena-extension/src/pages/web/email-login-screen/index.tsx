import AnimationLoadingAccount from '@assets/web/lottie/loading-accounts.json';
import React, { useCallback, useMemo } from 'react';

import { ADENA_DOCS_PAGE } from '@common/constants/resource.constant';
import IconEmail from '@assets/web/icon-email.svg';
import {
  WEB_SELECT_CONTENT_WIDTH,
  WEB_TOP_SPACING,
  WEB_TOP_SPACING_RESPONSIVE,
} from '@common/constants/ui.constant';
import { WebImg, WebMain } from '@components/atoms';
import { WebMainHeader } from '@components/pages/web/main-header';
import SensitiveInfoStep from '@components/pages/web/sensitive-info-step';
import SocialLoginFail from '@components/pages/web/social-login-fail';
import SocialLoginRequest from '@components/pages/web/social-login-request';
import SocialLoginSelectKeySet, {
  SOCIAL_LOGIN_SENSITIVE_INFO_DESC,
} from '@components/pages/web/social-login-select-key-set';
import useEmailLoginScreen from '@hooks/web/email-login/use-email-login-screen';

import EmailLoginEnterEmail from './enter-email';

const EmailLoginScreen: React.FC = () => {
  const {
    emailLoginState,
    failType,
    ableToSelectProduction,
    ableToSelectLegacy,
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
  } = useEmailLoginScreen();

  // The key-set step keeps the narrower column of the other option lists.
  const contentWidth = useMemo(() => {
    return emailLoginState === 'SELECT_KEY_SET' ? WEB_SELECT_CONTENT_WIDTH : undefined;
  }, [emailLoginState]);

  const topSpacing = useMemo(() => {
    if (emailLoginState !== 'REQUEST_LOGIN') {
      return {
        default: WEB_TOP_SPACING,
        responsive: WEB_TOP_SPACING_RESPONSIVE,
      };
    }
    return null;
  }, [emailLoginState]);

  const onClickGoBack = useCallback(() => {
    backStep();
  }, [backStep]);

  return (
    <WebMain
      width={contentWidth}
      spacing={topSpacing?.default || null}
      responsiveSpacing={topSpacing?.responsive || null}
    >
      {emailLoginState !== 'REQUEST_LOGIN' && (
        <WebMainHeader
          stepLength={indicatorInfo.stepLength}
          currentStep={indicatorInfo.stepNo}
          onClickGoBack={onClickGoBack}
        />
      )}
      {emailLoginState === 'SELECT_KEY_SET' && (
        <SocialLoginSelectKeySet
          providerName='Email'
          providerIcon={<WebImg src={IconEmail} size={24} />}
          ableToSelectProduction={ableToSelectProduction}
          ableToSelectLegacy={ableToSelectLegacy}
          selectKeySetType={selectKeySetType}
        />
      )}
      {emailLoginState === 'INIT' && (
        <SensitiveInfoStep
          desc={SOCIAL_LOGIN_SENSITIVE_INFO_DESC[keySetType]}
          onClickNext={initEmailLogin}
          link={`${ADENA_DOCS_PAGE}/user-guide/sign-in/sign-in-with-google`}
        />
      )}
      {emailLoginState === 'ENTER_EMAIL' && (
        <EmailLoginEnterEmail
          email={email}
          ableToConfirmEmail={ableToConfirmEmail}
          changeEmail={changeEmail}
          confirmEmail={confirmEmail}
        />
      )}
      {emailLoginState === 'REQUEST_LOGIN' && (
        <SocialLoginRequest
          title='Waiting for Email Login'
          description={'Complete your login by signing in with an email account\nin your browser. '}
          animationData={AnimationLoadingAccount}
          requestLogin={requestEmailLogin}
          cancelLogin={backStep}
        />
      )}
      {emailLoginState === 'FAILED' && (
        <SocialLoginFail providerName='email' failType={failType} retry={retry} />
      )}
    </WebMain>
  );
};

export default EmailLoginScreen;
