import styled from 'styled-components';

import mixins from '@styles/mixins';

export const ApproveLedgerLoadingWrapper = styled.div`
  ${mixins.flex('column', 'center', 'flex-start')};
  height: calc(100vh - 48px);
  padding: 50px 20px 24px;
  align-self: center;

  .icon {
    margin: 0 auto 20px auto;
  }

  div {
    text-align: center;
  }
`;
