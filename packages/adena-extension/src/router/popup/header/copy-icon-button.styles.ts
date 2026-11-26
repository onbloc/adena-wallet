import { getTheme } from '@styles/theme';
import styled from 'styled-components';

export const StyledCopyIconButton = styled.button.withConfig({
  shouldForwardProp: prop => prop !== 'isActive',
})<{ isActive?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;
  color: ${({ isActive, theme }): string => (isActive ? theme.neutral._1 : theme.neutral.a)};
  flex-shrink: 0;

  &:hover {
    color: ${getTheme('neutral', '_1')};
  }

  svg {
    width: 14px;
    height: 14px;
  }
`;
