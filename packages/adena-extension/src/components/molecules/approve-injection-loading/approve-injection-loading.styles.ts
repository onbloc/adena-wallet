import styled from 'styled-components';

import { fonts, getTheme } from '@styles/theme';

export const ApproveInjectionLoadingWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: auto;
  justify-content: center;
  align-items: center;
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
