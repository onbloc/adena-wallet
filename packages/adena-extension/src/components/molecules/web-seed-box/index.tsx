import styled, { useTheme } from 'styled-components';
import _ from 'lodash';

import { Row, View, WebText } from '../../atoms';
import { getTheme } from '@styles/theme';
import mixins from '@styles/mixins';

interface WebSeedBoxProps {
  seeds: string[];
  showBlur?: boolean;
}

const StyledContainer = styled(View)`
  width: 100%;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
`;

const StyledItem = styled(Row)<{ showBlur: boolean }>`
  position: relative;
  overflow: hidden;
  height: 40px;
  border-radius: 10px;
  border: 1px solid
    ${({ showBlur, theme }): string => (showBlur ? theme.webNeutral._800 : theme.webNeutral._600)};
  box-shadow: 0px 0px 0px 3px rgba(255, 255, 255, 0.04), 0px 1px 3px 0px rgba(0, 0, 0, 0.1),
    0px 1px 2px 0px rgba(0, 0, 0, 0.06);
`;

const StyledNoText = styled(WebText)`
  ${mixins.flex()}
  background: #181b1f;
  border-right: 1px solid ${getTheme('webNeutral', '_800')};
  width: 40px;
  height: 100%;
  align-items: center;
`;

const StyledBlurScreen = styled(View)`
  position: absolute;
  width: 100%;
  height: 100%;
  z-index: 1;
  background-color: #0000000a;
  backdrop-filter: blur(4px);
  border-radius: 10px;
`;

export const WebSeedBox = ({ seeds, showBlur = true }: WebSeedBoxProps): JSX.Element => {
  const theme = useTheme();
  return (
    <StyledContainer>
      {_.map(seeds, (seed, index) => (
        <StyledItem key={`seeds-${index}`} showBlur={showBlur}>
          <StyledNoText type='body4' color={theme.webNeutral._500}>
            {index + 1}
          </StyledNoText>
          <WebText type='body4' color={theme.webNeutral._100} style={{ paddingLeft: 12 }}>
            {seed}
          </WebText>
          {showBlur && <StyledBlurScreen />}
        </StyledItem>
      ))}
    </StyledContainer>
  );
};
