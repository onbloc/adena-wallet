import mixins from '@styles/mixins';
import { getTheme } from '@styles/theme';
import styled from 'styled-components';

export const EditNetworkWrapper = styled.div`
  ${mixins.flex({ align: 'normal', justify: 'normal' })};
  width: 100%;
  height: 100vh;

  & .content-wrapper {
    ${mixins.flex({ align: 'normal', justify: 'normal' })};
    width: 100%;
    height: 100%;
    padding: 24px 20px 72px 20px;
  }

  & .form-wrapper {
    ${mixins.flex({ align: 'normal', justify: 'normal' })};
    width: 100%;
    height: 100%;
    padding: 12px 0;
  }

  & .chain-group-label {
    padding: 0 4px 8px;
    color: ${getTheme('neutral', '_1')};
    font-size: 14px;
    font-weight: 600;
    line-height: 21px;
  }
`;
