import styled, { useTheme } from 'styled-components';

import { View, WebText } from '../../atoms';

interface WebPrivateKeyBoxProps {
  privateKey: string;
  showBlur?: boolean;
}

const StyledContainer = styled(View) <{ showBlur: boolean }>`
  position: relative;
  overflow: hidden;
  height: 96px;
  border-radius: 10px;
  border: 1px solid
    ${({ showBlur, theme }): string => (showBlur ? theme.webNeutral._800 : theme.webNeutral._600)};
  box-shadow: 0px 0px 0px 3px rgba(255, 255, 255, 0.04), 0px 1px 3px 0px rgba(0, 0, 0, 0.1),
    0px 1px 2px 0px rgba(0, 0, 0, 0.06);
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

export const WebPrivateKeyBox = ({ privateKey, showBlur = true }: WebPrivateKeyBoxProps): JSX.Element => {
  const theme = useTheme();

  return (
    <StyledContainer showBlur={showBlur}>
      <WebText
        type='body5'
        color={theme.webNeutral._100}
        style={{ padding: 24, whiteSpace: 'normal', wordBreak: 'break-all' }}
      >
        {privateKey}
      </WebText>
      {showBlur && <StyledBlurScreen />}
    </StyledContainer>
  );
};
