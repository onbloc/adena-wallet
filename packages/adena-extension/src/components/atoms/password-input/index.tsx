import { EvaluatePasswordResult } from '@common/utils/password-utils';
import { DefaultInput } from '../default-input';
import { View } from '../base';
import styled, { useTheme } from 'styled-components';
import { useMemo } from 'react';
import { Text } from '../text';

interface PasswordInputProps extends React.ComponentPropsWithoutRef<'input'> {
  evaluationResult?: EvaluatePasswordResult | null;
  error?: boolean;
  margin?: string;
  ref?: React.RefObject<HTMLInputElement>;
}

const StyledPasswordInputContainer = styled(View)`
  position: relative;
  width: 100%;
  justify-content: center;
`;

export const PasswordInput = ({ evaluationResult, ...rest }: PasswordInputProps): JSX.Element => {
  const theme = useTheme();

  const complexityColor = useMemo(() => {
    if (evaluationResult?.complexity === 'STRONG') return theme.webSuccess._100;
    if (evaluationResult?.complexity === 'MEDIUM') return theme.webWarning._100;
    return theme.webError._100;
  }, [evaluationResult]);

  const complexityText = useMemo(() => {
    if (evaluationResult?.complexity === 'STRONG') return 'Strong';
    if (evaluationResult?.complexity === 'MEDIUM') return 'Medium';
    return 'Week';
  }, [evaluationResult]);

  return (
    <StyledPasswordInputContainer>
      <DefaultInput
        style={{ padding: evaluationResult?.valid ? '14px 60px 14px 16px' : '14px 16px' }}
        {...rest}
      />
      {evaluationResult?.valid && (
        <Text
          style={{
            position: 'absolute',
            right: 16,
            letterSpacing: '-2%',
          }}
          type='body3Reg'
          color={complexityColor}
        >
          {complexityText}
        </Text>
      )}
    </StyledPasswordInputContainer>
  );
};
