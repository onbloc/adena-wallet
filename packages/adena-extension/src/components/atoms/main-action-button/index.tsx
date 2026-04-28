import React from 'react';
import styled from 'styled-components';

import { IconButtonLoading } from '@components/atoms/icon/icon-assets';
import { fonts, getTheme } from '@styles/theme';

interface MainActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
}

const StyledButton = styled.button`
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  height: 72px;
  padding: 0;
  border: none;
  border-radius: 18px;
  background: ${getTheme('neutral', '_7')};
  color: ${getTheme('neutral', 'a')};
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: ${getTheme('neutral', '_6')};
  }

  &:disabled {
    cursor: default;
    opacity: 0.6;
  }

  .label {
    ${fonts.body2Bold};
    color: ${getTheme('neutral', '_1')};
    line-height: 1;
  }

  .icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
`;

export const MainActionButton: React.FC<MainActionButtonProps> = ({
  icon,
  label,
  onClick,
  disabled = false,
  loading = false,
}) => (
  <StyledButton type='button' onClick={onClick} disabled={disabled || loading}>
    {loading ? (
      <IconButtonLoading />
    ) : (
      <>
        <span className='icon'>{icon}</span>
        <span className='label'>{label}</span>
      </>
    )}
  </StyledButton>
);

export default MainActionButton;
