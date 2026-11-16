import styled from 'styled-components';

import { getTheme } from '@styles/theme';
import mixins from '@styles/mixins';

export const ToggleWrapper = styled.div`
  ${mixins.flex({ align: 'normal', justify: 'normal' })};
  flex-shrink: 0;
  width: 46px;
  height: 26px;
  padding: 3px;
  border-radius: 100px;
  background-color: ${getTheme('neutral', '_5')};
  transition: 0.2s;
  cursor: pointer;

  .circle {
    display: block;
    width: 20px;
    height: 20px;
    background-color: ${getTheme('neutral', '_1')};
    border-radius: 20px;
    transition: 0.2s;
  }

  &.activated {
    background-color: ${getTheme('primary', '_7')};

    .circle {
      margin-left: 20px;
    }
  }
`;
