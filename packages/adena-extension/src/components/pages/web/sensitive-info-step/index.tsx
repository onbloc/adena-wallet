import { ReactElement } from 'react';
import styled, { useTheme } from 'styled-components';

import IconAlert from '@assets/web/alert-rounded.svg';
import IconLink from '@assets/web/external-link.svg';

import { Pressable, Row, View, WebButton, WebImg, WebText } from '@components/atoms';
import useLink from '@hooks/use-link';

const StyledContainer = styled(View)`
  width: 100%;
  height: 345px;
  row-gap: 40px;
  align-items: flex-start;
`;

const StyledMessageBox = styled(View)`
  row-gap: 16px;
`;

export type SensitiveInfoStepProps = {
  link?: string;
  desc: string;
  onClickNext: () => void;
};

export const SensitiveInfoStep = ({
  link,
  desc,
  onClickNext,
}: SensitiveInfoStepProps): ReactElement => {
  const theme = useTheme();
  const { openLink } = useLink();

  return (
    <StyledContainer>
      <View style={{ rowGap: 24, alignItems: 'flex-start' }}>
        <WebImg src={IconAlert} />
        <StyledMessageBox>
          <WebText type='headline2'>Sensitive Information Ahead</WebText>
          <WebText type='body4' color={theme.webNeutral._500}>
            {desc}
          </WebText>
        </StyledMessageBox>
      </View>
      <WebButton
        figure='primary'
        size='small'
        onClick={onClickNext}
        text='Next'
        rightIcon='chevronRight'
      />
      <Pressable
        onClick={(): void => {
          // TODO: link to docs
          openLink(link || 'https://docs.adena.app/');
        }}
      >
        <Row style={{ columnGap: 6 }}>
          <WebText type='title5' color={theme.webNeutral._600}>
            Learn More
          </WebText>
          <WebImg src={IconLink} size={20} />
        </Row>
      </Pressable>
    </StyledContainer>
  );
};

export default SensitiveInfoStep;
