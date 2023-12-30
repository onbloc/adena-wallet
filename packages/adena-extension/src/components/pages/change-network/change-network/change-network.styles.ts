import mixins from '@styles/mixins';
import styled from 'styled-components';

export const ChangeNetworkWrapper = styled.div`
  ${mixins.flex({ align: 'normal', justify: 'normal' })};
  width: 100%;
  height: auto;

  .content-wrapper {
    padding: 12px 20px;
    margin-bottom: 78px;

    .title {
      margin: 12px 0;
    }
  }
`;
