import { ReactElement } from 'react';
import styled, { useTheme } from 'styled-components';

import createSrc from '@assets/web/create.svg';
import importSrc from '@assets/web/import.svg';
import googleSrc from '@assets/web/google.svg';
import thunderSrc from '@assets/web/round-thunder.svg';
import warningSrc from '@assets/web/warning.svg';

import { Row, View, WebButton, WebMain, WebText, WebImg } from '@components/atoms';
import useAppNavigate from '@hooks/use-app-navigate';
import { RoutePath } from '@types';
import { WebMainHeader } from '@components/pages/web/main-header';

const StyledWarnBox = styled(Row)`
  column-gap: 8px;
  padding: 8px;
  border-radius: 8px;
  background: rgba(251, 191, 36, 0.08);
`;

const AdvancedOptionScreen = (): ReactElement => {
  const { navigate } = useAppNavigate();
  const theme = useTheme();

  return (
    <WebMain>
      <WebMainHeader
        length={5}
        onClickGoBack={(): void => {
          navigate(RoutePath.Home);
        }}
        step={0}
      />
      <WebImg src={thunderSrc} size={80} />
      <View style={{ rowGap: 16 }}>
        <WebText type='headline1'>Advanced Options</WebText>
        <StyledWarnBox>
          <WebImg src={warningSrc} size={20} />
          <WebText type='body6' color={theme.webWarning._100}>
            These options involve sensitive information and should only be used by experienced
            users.
          </WebText>
        </StyledWarnBox>
      </View>

      <Row style={{ columnGap: 12 }}>
        <WebButton
          figure='primary'
          size='large'
          onClick={(): void => {
            navigate(RoutePath.WebWalletCreate);
          }}
          style={{ width: 176 }}
        >
          <View style={{ height: 74, justifyContent: 'space-between' }}>
            <WebImg src={createSrc} size={24} />
            <WebText type='title5'>Create New Wallet</WebText>
          </View>
        </WebButton>
        <WebButton figure='secondary' size='large' style={{ width: 176 }}>
          <View style={{ height: 74, justifyContent: 'space-between' }}>
            <WebImg src={importSrc} size={24} />
            <WebText type='title5'>Import Existing Wallet</WebText>
          </View>
        </WebButton>
        <WebButton figure='tertiary' size='large' style={{ width: 176 }}>
          <View style={{ height: 74, justifyContent: 'space-between' }}>
            <WebImg src={googleSrc} size={24} />
            <WebText type='title5'>Sign In With Google</WebText>
          </View>
        </WebButton>
      </Row>
    </WebMain>
  );
};

export default AdvancedOptionScreen;
