import React from 'react';
import { WebTextarea } from '@components/atoms/web-textarea';
import styled from 'styled-components';

import { View } from '../../atoms';

interface WebPrivateKeyBoxProps {
  privateKey: string;
  showBlur?: boolean;
  readOnly?: boolean;
  error?: boolean;
}

const StyledContainer = styled(View) <{ showBlur: boolean }>`
  position: relative;
  overflow: hidden;
  height: 80px;
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

export const WebPrivateKeyBox = ({ privateKey, showBlur = true, readOnly = false, error = false }: WebPrivateKeyBoxProps): JSX.Element => {

  return (
    <StyledContainer showBlur={showBlur}>
      <WebTextarea
        value={privateKey}
        placeholder='Private Key'
        readOnly={readOnly}
        error={error}
        style={{ height: '100%' }}
        onChange={(): void => { return; }}
        spellCheck={false}
      />
      {showBlur && <StyledBlurScreen />}
    </StyledContainer>
  );
};
