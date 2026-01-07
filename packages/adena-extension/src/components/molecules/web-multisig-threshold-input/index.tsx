import React from 'react';
import styled from 'styled-components';

import { View, WebInputWithLabel } from '@components/atoms';

interface WebMultisigThresholdInputProps {
  threshold: number;
  onThresholdChange: (threshold: number) => void;
  multisigConfigError: string | null;
}

export const WebMultisigThresholdInput = ({
  threshold,
  onThresholdChange,
  multisigConfigError,
}: WebMultisigThresholdInputProps): React.ReactElement => {
  const handleChange = (value: string): void => {
    const numericValue = value.replace(/[^0-9]/g, '');
    onThresholdChange(numericValue === '' ? 0 : Number(numericValue));
  };

  const hasError = Boolean(multisigConfigError);

  return (
    <StyledContainer>
      <WebInputWithLabel
        label='Threshold'
        value={threshold.toString()}
        onChange={handleChange}
        error={hasError}
      />
    </StyledContainer>
  );
};

const StyledContainer = styled(View)`
  width: 100%;
  row-gap: 16px;
`;
