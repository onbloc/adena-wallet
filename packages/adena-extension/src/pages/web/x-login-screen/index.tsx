import AnimationLoadingAccount from '@assets/web/lottie/loading-accounts.json';
import React, { useCallback, useMemo } from 'react';

import { ADENA_DOCS_PAGE } from '@common/constants/resource.constant';
import { WEB_TOP_SPACING, WEB_TOP_SPACING_RESPONSIVE } from '@common/constants/ui.constant';
import { WebMain } from '@components/atoms';
import { WebMainHeader } from '@components/pages/web/main-header';
import SensitiveInfoStep from '@components/pages/web/sensitive-info-step';
import SocialLoginFail from '@components/pages/web/social-login-fail';
import SocialLoginRequest from '@components/pages/web/social-login-request';
import useXLoginScreen from '@hooks/web/x-login/use-x-login-screen';

const XLoginScreen: React.FC = () => {
  const { xLoginState, failType, indicatorInfo, initXLogin, backStep, retry, requestXLogin } =
    useXLoginScreen();

  const topSpacing = useMemo(() => {
    if (xLoginState !== 'REQUEST_LOGIN') {
      return {
        default: WEB_TOP_SPACING,
        responsive: WEB_TOP_SPACING_RESPONSIVE,
      };
    }
    return null;
  }, [xLoginState]);

  const onClickGoBack = useCallback(() => {
    backStep();
  }, [backStep]);

  return (
    <WebMain
      spacing={topSpacing?.default || null}
      responsiveSpacing={topSpacing?.responsive || null}
    >
      {xLoginState !== 'REQUEST_LOGIN' && (
        <WebMainHeader
          stepLength={indicatorInfo.stepLength}
          currentStep={indicatorInfo.stepNo}
          onClickGoBack={onClickGoBack}
        />
      )}
      {xLoginState === 'INIT' && (
        <SensitiveInfoStep
          desc={
            'You are about to construct a private key on your device using Web3Auth,\na third party service provider. This account will be accessible with your\nsocial logins.'
          }
          onClickNext={initXLogin}
          link={`${ADENA_DOCS_PAGE}/user-guide/sign-in/sign-in-with-google`}
        />
      )}
      {xLoginState === 'REQUEST_LOGIN' && (
        <SocialLoginRequest
          title='Waiting for X Login'
          description={'Complete your login by signing in with an X account\nin your browser. '}
          animationData={AnimationLoadingAccount}
          requestLogin={requestXLogin}
          cancelLogin={backStep}
        />
      )}
      {xLoginState === 'FAILED' && (
        <SocialLoginFail providerName='X' failType={failType} retry={retry} />
      )}
    </WebMain>
  );
};

export default XLoginScreen;
