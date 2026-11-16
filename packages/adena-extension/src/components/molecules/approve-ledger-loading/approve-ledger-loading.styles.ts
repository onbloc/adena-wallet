import styled from 'styled-components';

import mixins from '@styles/mixins';

export const ApproveLedgerLoadingWrapper = styled.div`
  ${mixins.flex({ justify: 'flex-start' })};
  width: 100%;
  height: auto;
  padding: 50px 20px 120px;
  align-self: center;

  .icon {
    display: flex;
    flex-shrink:
    margin: 0 auto 20px auto;
  }

  div {
    text-align: center;
  }

  .data-wrapper {
    ${mixins.flex({ justify: 'flex-start' })};
    width: 100%;
    margin-top: 20px;
  }
`;
