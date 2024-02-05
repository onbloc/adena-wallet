import mixins from '@styles/mixins';
import { getTheme } from '@styles/theme';
import styled from 'styled-components';

interface CopyButtonWrapperProps {
  checked: boolean;
  size: number;
}

export const CopyButtonWrapper = styled.div<CopyButtonWrapperProps>`
  ${mixins.flex({ align: 'normal', justify: 'normal' })};
  width: ${({ size }): string => `${size}px`};
  height: ${({ size }): string => `${size}px`};
  cursor: pointer;

  svg {
    width: ${({ size }): string => `${size}px`};
    height: ${({ size }): string => `${size}px`};
    path {
      transition: 0.2s;
      stroke: ${({ theme, checked }): string => (checked ? theme.neutral._1 : theme.neutral.a)};
    }
  }

  :hover svg {
    path {
      stroke: ${getTheme('neutral', '_1')};
    }
  }
`;
