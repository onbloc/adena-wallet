import mixins from '@styles/mixins';
import styled from 'styled-components';

export const NetworkListWrapper = styled.div`
  ${mixins.flex({ align: 'normal', justify: 'normal' })};
  width: 100%;
  height: auto;

  & > div {
    margin-bottom: 12px;

    &:last-child {
      margin-bottom: 0;
    }
  }
`;
