import mixins from '@styles/mixins';
import { getTheme } from '@styles/theme';
import styled from 'styled-components';

interface CopyButtonWrapperProps {
  checked: boolean;
}

export const CopyButtonWrapper = styled.div<CopyButtonWrapperProps>`
  ${mixins.flex({ align: 'normal', justify: 'normal' })};
  width: 16px;
  height: 16px;
  cursor: pointer;

  svg {
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
