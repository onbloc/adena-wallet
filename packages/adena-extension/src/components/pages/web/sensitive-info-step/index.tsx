import { ReactElement } from 'react';
import styled, { useTheme } from 'styled-components';

import IconAlert from '@assets/web/alert-rounded.svg';
import IconLink from '@assets/web/external-link.svg';

import { Pressable, Row, View, WebButton, WebImg, WebText } from '@components/atoms';
import useLink from '@hooks/use-link';
import { WebTitleWithDescription } from '@components/molecules';

const StyledContainer = styled(View)`
  width: 100%;
  height: 345px;
  row-gap: 40px;
  align-items: flex-start;
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
      <View style={{ rowGap: 32, alignItems: 'flex-start' }}>
        <WebImg src={IconAlert} size={88} />
        <WebTitleWithDescription title='Sensitive Information Ahead' description={desc} />
      </View>
      <WebButton
        figure='primary'
        size='small'
        onClick={onClickNext}
        text='Next'
        rightIcon='chevronRight'
        style={{ width: 116 }}
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
