import React, { useCallback } from 'react';
import styled from 'styled-components';

import IconGoogle from '@assets/web/icon-google';
import IconImport from '@assets/web/icon-import';
import { GoogleKeySetType } from '@common/constants/web3auth.constant';
import { View } from '@components/atoms';
import WebMainButton from '@components/atoms/web-main-button';
import { WebTitleWithDescription } from '@components/molecules';

const StyledContainer = styled(View)`
  width: 100%;
  row-gap: 24px;
  align-items: flex-start;
`;

interface GoogleLoginSelectKeySetProps {
  ableToSelectProduction: boolean;
  ableToSelectLegacy: boolean;
  selectKeySetType: (keySetType: GoogleKeySetType) => void;
}

const GoogleLoginSelectKeySet: React.FC<GoogleLoginSelectKeySetProps> = ({
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
        description={
          'Your private key is derived from the Web3Auth verifier used at sign-in.\nAccounts created on the previous verifier can only be accessed through it,\nso pick the type that matches your account.'
        }
      />
      <View style={{ rowGap: 16, width: '100%' }}>
        <WebMainButton
          layout='list'
          figure='primary'
          iconElement={<IconGoogle />}
          disabled={!ableToSelectProduction}
          text='Google Account'
          description='Sign in with the current verifier. Use this for a new account.'
          onClick={onClickProduction}
        />
        <WebMainButton
          layout='list'
          figure='secondary'
          iconElement={<IconImport />}
          disabled={!ableToSelectLegacy}
          text='Legacy Google Account'
          description='Sign in with the previous verifier to access an account created with it.'
          onClick={onClickLegacy}
        />
      </View>
    </StyledContainer>
  );
};

export default GoogleLoginSelectKeySet;
