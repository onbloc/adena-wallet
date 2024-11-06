import React, { useCallback } from 'react';
import styled from 'styled-components';

import { Pressable, Row, View, WebButton, WebImg, WebText } from '@components/atoms';
import { WebTitleWithDescription } from '@components/molecules';
import WebWarningDescriptionBox from '@components/molecules/web-warning-description-box/web-warning-description-box';

import IconAirgap from '@assets/web/airgap-green.svg';
import IconLink from '@assets/web/link.svg';
import {
  ADENA_SETUP_AIRGAP_HELP_PAGE,
  GNO_CLI_HELP_PAGE,
} from '@common/constants/resource.constant';
import useLink from '@hooks/use-link';

const StyledContainer = styled(View)`
  width: 100%;
  row-gap: 24px;
`;

const StyledButtonWrapper = styled(View)`
  align-items: flex-start;
`;

const StyledLinkWrapper = styled(Row)`
  gap: 6px;
  align-items: flex-start;

  & > * {
    color: #6c717a;
  }
`;

const description = `The air-gapped signing mechanism allows for offline transaction signing for maximum
security. To send transactions, you must create a signed transaction file in your air-gapped
device using the Gno CLI and transfer it to Adena for broadcasting.`;

interface SetupAirgapInitProps {
  initSetup: () => void;
}

const SetupAirgapInit: React.FC<SetupAirgapInitProps> = ({ initSetup }) => {
  const { openLink } = useLink();

  const moveGnoCliHelp = useCallback(() => {
    openLink(GNO_CLI_HELP_PAGE);
  }, [openLink]);

  const moveAirgapSignHelp = useCallback(() => {
    openLink(ADENA_SETUP_AIRGAP_HELP_PAGE);
  }, [openLink]);

  return (
    <StyledContainer>
      <View style={{ marginBottom: 8 }}>
        <WebImg src={IconAirgap} size={88} />
      </View>

      <WebTitleWithDescription
        title='Set Up Airgap Account'
        description={
          'You can import an account from your custom airgap setup. To sign\ntransactions, use the gno.land CLI.'
        }
        marginBottom={-6}
      />

      <WebWarningDescriptionBox description={description} />

      <StyledButtonWrapper>
        <WebButton
          figure='primary'
          size='small'
          onClick={initSetup}
          text='Next'
          rightIcon='chevronRight'
        />
      </StyledButtonWrapper>

      <View style={{ gap: 8 }}>
        <Pressable onClick={moveGnoCliHelp}>
          <StyledLinkWrapper>
            <WebText type='title6' color='#6C717A'>
              How to use the Gno CLI
            </WebText>
            <WebImg src={IconLink} size={16} />
          </StyledLinkWrapper>
        </Pressable>

        <Pressable onClick={moveAirgapSignHelp}>
          <StyledLinkWrapper>
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
