import React, { useCallback } from 'react';

import { WebMain } from '@components/atoms';
import { WebMainHeader } from '@components/pages/web/main-header';
import useGoogleLoginScreen from '@hooks/web/google-login/use-google-login-screen';

import GoogleLoginInitStep from './init-step';
import GoogleLoginRequest from './request';
import GoogleLoginRequestFail from './request-fail';

const GoogleLoginScreen: React.FC = () => {
  const {
    googleLoginState,
    stepLength,
    googleLoginStepNo,
    backStep,
    retry,
    initGoogleLogin,
    requestGoogleLogin,
  } = useGoogleLoginScreen();

  const onClickGoBack = useCallback(() => {
    backStep();
  }, [backStep]);

  return (
    <WebMain>
      {googleLoginState === 'INIT' && (
        <WebMainHeader
          stepLength={stepLength}
          currentStep={googleLoginStepNo[googleLoginState]}
          onClickGoBack={onClickGoBack}
        />
      )}
      {googleLoginState === 'INIT' && (
        <GoogleLoginInitStep
          initGoogleLogin={initGoogleLogin}
        />
      )}
      {googleLoginState === 'REQUEST_LOGIN' && (
        <GoogleLoginRequest
          requestGoogleLogin={requestGoogleLogin}
          backStep={backStep}
        />
      )}
      {googleLoginState === 'FAILED' && (
        <GoogleLoginRequestFail retry={retry} />
      )}
    </WebMain>
  );
};

export default GoogleLoginScreen;
