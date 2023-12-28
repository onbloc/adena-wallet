import mixins from '@styles/mixins';
import styled from 'styled-components';

export const TransferLedgerRejectWrapper = styled.div`
  ${mixins.flex({ align: 'normal', justify: 'flex-start' })};
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 444px;

  .reject-icon {
    width: 100px;
    height: 100px;
    margin: 20px auto;
  }

  div {
    text-align: center;
  }

  .close-button {
    position: absolute;
    bottom: 0;
  }
`;
