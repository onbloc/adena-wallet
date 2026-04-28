import React from 'react';
import styled from 'styled-components';

import IconChevronDown from '@assets/icon-chevron-down';
import { fonts } from '@styles/theme';

interface AccountSelectorButtonProps {
  name: string;
  onClick?: () => void;
}

const StyledButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 6px;
  margin: 0;
  background: none;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: ${({ theme }): string => theme.neutral._1};
  transition: background-color 0.15s ease;

  &:hover {
    background-color: ${({ theme }): string => theme.neutral._7};
  }

  .name {
    ${fonts.body1Bold};
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .chevron {
    display: inline-flex;
    align-items: center;
    color: ${({ theme }): string => theme.neutral._1};
  }
`;

export const AccountSelectorButton: React.FC<AccountSelectorButtonProps> = ({
  name,
  onClick,
}) => (
  <StyledButton type='button' onClick={onClick} aria-label='Open account menu'>
    <span className='name'>{name}</span>
    <span className='chevron'>
      <IconChevronDown />
    </span>
  </StyledButton>
);

export default AccountSelectorButton;
