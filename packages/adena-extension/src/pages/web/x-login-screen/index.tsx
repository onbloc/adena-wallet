import AnimationLoadingAccount from '@assets/web/lottie/loading-accounts.json';
import React, { useCallback, useMemo } from 'react';

import { ADENA_DOCS_PAGE } from '@common/constants/resource.constant';
import IconX from '@assets/web/icon-x.svg';
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
import useXLoginScreen from '@hooks/web/x-login/use-x-login-screen';

const XLoginScreen: React.FC = () => {
  const {
    xLoginState,
    failType,
    ableToSelectProduction,
    ableToSelectLegacy,
    keySetType,
    indicatorInfo,
    selectKeySetType,
    initXLogin,
    backStep,
    retry,
    requestXLogin,
  } = useXLoginScreen();

  // The key-set step keeps the narrower column of the other option lists.
  const contentWidth = useMemo(() => {
    return xLoginState === 'SELECT_KEY_SET' ? WEB_SELECT_CONTENT_WIDTH : undefined;
  }, [xLoginState]);

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
      width={contentWidth}
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
      {xLoginState === 'SELECT_KEY_SET' && (
        <SocialLoginSelectKeySet
          providerName='X'
          providerIcon={<WebImg src={IconX} size={24} />}
          ableToSelectProduction={ableToSelectProduction}
          ableToSelectLegacy={ableToSelectLegacy}
          selectKeySetType={selectKeySetType}
        />
      )}
      {xLoginState === 'INIT' && (
        <SensitiveInfoStep
          desc={SOCIAL_LOGIN_SENSITIVE_INFO_DESC[keySetType]}
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
