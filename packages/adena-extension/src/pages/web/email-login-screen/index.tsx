import AnimationLoadingAccount from '@assets/web/lottie/loading-accounts.json';
import React, { useCallback, useMemo } from 'react';

import { ADENA_DOCS_PAGE } from '@common/constants/resource.constant';
import { WEB_TOP_SPACING, WEB_TOP_SPACING_RESPONSIVE } from '@common/constants/ui.constant';
import { WebMain } from '@components/atoms';
import { WebMainHeader } from '@components/pages/web/main-header';
import SensitiveInfoStep from '@components/pages/web/sensitive-info-step';
import SocialLoginFail from '@components/pages/web/social-login-fail';
import SocialLoginRequest from '@components/pages/web/social-login-request';
import useEmailLoginScreen from '@hooks/web/email-login/use-email-login-screen';

import EmailLoginEnterEmail from './enter-email';

const EmailLoginScreen: React.FC = () => {
  const {
    emailLoginState,
    failType,
    email,
    ableToConfirmEmail,
    indicatorInfo,
    initEmailLogin,
    changeEmail,
    confirmEmail,
    backStep,
    retry,
    requestEmailLogin,
  } = useEmailLoginScreen();

  const topSpacing = useMemo(() => {
    if (emailLoginState === 'INIT' || emailLoginState === 'ENTER_EMAIL') {
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
      spacing={topSpacing?.default || null}
      responsiveSpacing={topSpacing?.responsive || null}
    >
      {(emailLoginState === 'INIT' || emailLoginState === 'ENTER_EMAIL') && (
        <WebMainHeader
          stepLength={indicatorInfo.stepLength}
          currentStep={indicatorInfo.stepNo}
          onClickGoBack={onClickGoBack}
        />
      )}
      {emailLoginState === 'INIT' && (
        <SensitiveInfoStep
          desc={
            'You are about to construct a private key on your device using Web3Auth,\na third party service provider. This account will be accessible with your\nsocial logins.'
          }
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
