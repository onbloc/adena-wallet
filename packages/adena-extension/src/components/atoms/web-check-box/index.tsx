import React, { ReactElement } from 'react';
import styled from 'styled-components';

import check from '@assets/web/check.svg';

import { View } from '../base';

type WebCheckBoxProps = {
  checked: boolean;
  onClick?: () => void;
  disabled?: boolean;
};

const StyledContainer = styled(View) <{ checked: boolean; disabled?: boolean }>`
  cursor: ${({ disabled }): string => (disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ disabled }): number => (disabled ? 0.5 : 1)};
  outline: ${({ checked }): string => (checked ? 'none' : '0.5px solid #6C717A')};
  width: 20px;
  height: 20px;
  background-color: ${({ checked, theme }): string =>
    checked ? theme.webPrimary._100 : 'transparent'};
  align-items: center;
  justify-content: center;
  border-radius: 4px;
`;

export const WebCheckBox = ({ checked, onClick, disabled }: WebCheckBoxProps): ReactElement => {
  return (
    <StyledContainer checked={checked} onClick={onClick} disabled={disabled}>
      {checked && <img src={check} width={16} height={16} />}
    </StyledContainer>
  );
};
