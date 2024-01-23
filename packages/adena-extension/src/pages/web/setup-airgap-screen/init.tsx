import React, { useCallback } from 'react';
import styled, { useTheme } from 'styled-components';

import { Pressable, Row, View, WebButton, WebImg, WebText } from '@components/atoms';
import WebWarningDescriptionBox from '@components/molecules/web-warning-description-box/web-warning-description-box';

import IconNext from '@assets/web/chevron-right.svg';
import IconLink from '@assets/web/link.svg';
import IconAirgap from '@assets/web/airgap-green.svg';
import useLink from '@hooks/use-link';
import { ADENA_DOCS_PAGE } from '@common/constants/resource.constant';

const StyledContainer = styled(View)`
  row-gap: 24px;
`;

const StyledMessageBox = styled(View)`
  row-gap: 16px;
`;

const StyledButtonWrapper = styled(View)`
  align-items: flex-start;
`;

const StyledLinkWrapper = styled(Row)`
  gap: 6px;
  align-items: flex-start;

  & > * {
    color: #6C717A;
  }
`;

interface SetupAirgapInitProps {
  initSetup: () => void;
}

const SetupAirgapInit: React.FC<SetupAirgapInitProps> = ({
  initSetup,
}) => {
  const theme = useTheme();
  const { openLink } = useLink()

  const moveGnoCliHelp = useCallback(() => {
    openLink(ADENA_DOCS_PAGE);
  }, [openLink]);

  const moveAirgapSignHelp = useCallback(() => {
    openLink(ADENA_DOCS_PAGE);
  }, [openLink]);

  return (
    <StyledContainer>
      <WebImg src={IconAirgap} size={90} />

      <StyledMessageBox>
        <WebText type='headline3'>Set Up Airgap Account</WebText>
        <WebText type='body4' color={theme.webNeutral._500} style={{ whiteSpace: 'pre-line' }}>
          {'You can import an account from your custom airgap\nsetup. To sign transactions, use the Gnoland CLI.'}
        </WebText>
      </StyledMessageBox>

      <WebWarningDescriptionBox
        description='The air-gapped signing mechanism allows for offline transaction signing for maximum security. To send transactions, you must create a signed transaction file in your air-gapped device using the Gno CLI and transfer it to Adena for broadcasting.'
      />

      <StyledButtonWrapper>
        <WebButton
          figure='primary'
          size='small'
          onClick={initSetup}
        >
          <Row>
            <WebText type='title4'>Next</WebText>
            <WebImg src={IconNext} size={24} />
          </Row>
        </WebButton>
      </StyledButtonWrapper>

      <View style={{ gap: 8 }}>
        <Pressable onClick={moveGnoCliHelp}>
          <StyledLinkWrapper onClick={moveGnoCliHelp}>
            <WebText type='title6' color='#6C717A'>
              How to use the Gno CLI
            </WebText>
            <WebImg src={IconLink} size={16} />
          </StyledLinkWrapper>
        </Pressable>

        <Pressable onClick={moveAirgapSignHelp}>
          <StyledLinkWrapper >
            <WebText type='title6' color='#6C717A'>
              How the Air-gapped signing works
            </WebText>
            <WebImg src={IconLink} size={16} />
          </StyledLinkWrapper>
        </Pressable>
      </View>
    </StyledContainer>
  );
};

export default SetupAirgapInit;
