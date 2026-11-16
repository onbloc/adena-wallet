import mixins from '@styles/mixins';
import { getTheme } from '@styles/theme';
import styled from 'styled-components';

export const AddCustomNetworkWrapper = styled.div`
  ${mixins.flex({ align: 'normal', justify: 'normal' })};
  width: 100%;
  padding: 24px 20px 120px 20px;

  .chain-group-label {
    padding: 0 4px 8px;
    color: ${getTheme('neutral', '_1')};
    font-size: 14px;
    font-weight: 600;
    line-height: 21px;
  }
`;
