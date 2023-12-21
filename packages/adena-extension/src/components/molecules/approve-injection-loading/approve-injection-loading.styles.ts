import styled from 'styled-components';

import theme, { fonts } from '@styles/theme';

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
    color: ${theme.color.neutral[0]};
    ${fonts.header4}
  }

  .sub-description {
    margin-top: 12px;
    color: ${theme.color.neutral[9]};
    ${fonts.body1Reg}
  }
`;
