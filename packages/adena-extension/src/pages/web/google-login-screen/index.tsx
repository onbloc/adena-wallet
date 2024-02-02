import React, { useCallback, useMemo } from 'react';

import { WebMain } from '@components/atoms';
import { WebMainHeader } from '@components/pages/web/main-header';
import useGoogleLoginScreen from '@hooks/web/google-login/use-google-login-screen';

import GoogleLoginRequest from './request';
import GoogleLoginRequestFail from './request-fail';
import SensitiveInfoStep from '@components/pages/web/sensitive-info-step';
import { ADENA_DOCS_PAGE } from '@common/constants/resource.constant';

const GoogleLoginScreen: React.FC = () => {
  const {
    googleLoginState,
    indicatorInfo,
    backStep,
    retry,
    initGoogleLogin,
    requestGoogleLogin,
  } = useGoogleLoginScreen();

  const topSpacing = useMemo(() => {
    if (googleLoginState === 'INIT') {
      return 272;
    }
    return 344;
  }, [googleLoginState]);

  const onClickGoBack = useCallback(() => {
    backStep();
  }, [backStep]);

  return (
    <WebMain spacing={topSpacing}>
      {googleLoginState === 'INIT' && (
        <>
          <WebMainHeader
            stepLength={indicatorInfo.stepLength}
            currentStep={indicatorInfo.stepNo}
            onClickGoBack={onClickGoBack}
          />
          <SensitiveInfoStep
            desc={
              'You are about to construct a private key on your device using Web3Auth,\na third party service provider. This account will be accessible with your\nsocial logins.'
            }
            onClickNext={initGoogleLogin}
            link={`${ADENA_DOCS_PAGE}/user-guide/sign-in/sign-in-with-google`}
          />
        </>
      )}
      {googleLoginState === 'REQUEST_LOGIN' && (
        <GoogleLoginRequest requestGoogleLogin={requestGoogleLogin} backStep={backStep} />
      )}
      {googleLoginState === 'FAILED' && <GoogleLoginRequestFail retry={retry} />}
    </WebMain>
  );
};

export default GoogleLoginScreen;
