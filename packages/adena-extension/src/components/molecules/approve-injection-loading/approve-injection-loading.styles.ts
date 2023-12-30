import styled from 'styled-components';

import { fonts, getTheme } from '@styles/theme';
import mixins from '@styles/mixins';

export const ApproveInjectionLoadingWrapper = styled.div`
  ${mixins.flex()};
  width: 100%;
  height: auto;
  margin-top: 80px;

  .description {
    margin-top: 23px;
    color: ${getTheme('neutral', '_1')};
    ${fonts.header4}
  }

  .sub-description {
    margin-top: 12px;
    color: ${getTheme('neutral', 'a')};
    ${fonts.body1Reg}
  }
`;
