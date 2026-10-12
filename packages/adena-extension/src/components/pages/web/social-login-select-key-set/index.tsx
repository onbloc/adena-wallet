import React, { useCallback } from 'react';
import styled from 'styled-components';

import IconImport from '@assets/web/icon-import';
import { SocialKeySetType } from '@common/constants/web3auth.constant';
import { View } from '@components/atoms';
import WebMainButton from '@components/atoms/web-main-button';
import { WebTitleWithDescription } from '@components/molecules';

const StyledContainer = styled(View)`
  width: 100%;
  row-gap: 24px;
  align-items: flex-start;
`;

export const SOCIAL_LOGIN_SENSITIVE_INFO_DESC: Record<SocialKeySetType, string> = {
  LEGACY:
    'You are about to construct a private key on your device using Web3Auth,\na third party service provider, with the previous verifier. This account\nwill be accessible with your social logins.',
  PRODUCTION:
    'You are about to construct a private key on your device using Web3Auth,\na third party service provider. This account will be accessible with your\nsocial logins.',
};

export interface SocialLoginSelectKeySetProps {
  /** Provider name used in the option labels, e.g. 'Google'. */
  providerName: string;
  providerIcon: JSX.Element;
  ableToSelectProduction: boolean;
  ableToSelectLegacy: boolean;
  selectKeySetType: (keySetType: SocialKeySetType) => void;
}

const SocialLoginSelectKeySet: React.FC<SocialLoginSelectKeySetProps> = ({
  providerName,
  providerIcon,
  ableToSelectProduction,
  ableToSelectLegacy,
  selectKeySetType,
}) => {
  const onClickProduction = useCallback(() => {
    selectKeySetType('PRODUCTION');
  }, [selectKeySetType]);

  const onClickLegacy = useCallback(() => {
    selectKeySetType('LEGACY');
  }, [selectKeySetType]);

  return (
    <StyledContainer>
      <WebTitleWithDescription
        title='Select Your Account Type'
        description='Your private key depends on the verifier used at sign-in, so pick the type that matches your account.'
      />
      <View style={{ rowGap: 16, width: '100%' }}>
        <WebMainButton
          layout='list'
          figure='primary'
          iconElement={providerIcon}
          disabled={!ableToSelectProduction}
          text={`${providerName} Account`}
          description='Sign in with the current verifier. Use this for a new account.'
          onClick={onClickProduction}
        />
        <WebMainButton
          layout='list'
          figure='secondary'
          iconElement={<IconImport />}
          disabled={!ableToSelectLegacy}
          text={`Legacy ${providerName} Account`}
          description='Sign in with the previous verifier to access an account created with it.'
          onClick={onClickLegacy}
        />
      </View>
    </StyledContainer>
  );
};

export default SocialLoginSelectKeySet;
