import { WebTextarea } from '@components/atoms/web-textarea';
import { useEffect, useState } from 'react';
import styled from 'styled-components';

import { stringFromBase64 } from '@common/utils/encoding-util';
import { generateRandomHex } from '@common/utils/rand-utils';
import { View } from '../../atoms';

interface WebPrivateKeyBoxProps {
  privateKey: string;
  showBlur?: boolean;
  readOnly?: boolean;
  error?: boolean;
}

const StyledContainer = styled(View)<{ showBlur: boolean }>`
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

export const WebPrivateKeyBox = ({
  privateKey,
  showBlur = true,
  readOnly = false,
  error = false,
}: WebPrivateKeyBoxProps): JSX.Element => {
  const randomHexString = generateRandomHex();
  const [displayPrivateKey, setDisplayPrivateKey] = useState<string>(randomHexString);

  useEffect(() => {
    if (!showBlur) {
      setDisplayPrivateKey(stringFromBase64(privateKey));
      return;
    }

    setDisplayPrivateKey(randomHexString);
  }, [showBlur, privateKey]);

  useEffect(() => {
    return () => {
      setDisplayPrivateKey('');
    };
  }, []);

  return (
    <StyledContainer showBlur={showBlur}>
      <WebTextarea
        value={displayPrivateKey}
        placeholder='Private Key'
        readOnly={readOnly}
        error={error}
        style={{ height: '100%' }}
        onChange={(): void => {
          return;
        }}
        spellCheck={false}
      />
      {showBlur && <StyledBlurScreen />}
    </StyledContainer>
  );
};
