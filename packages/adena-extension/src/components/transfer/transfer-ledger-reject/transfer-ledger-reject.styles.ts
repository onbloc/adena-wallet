import styled from 'styled-components';

export const TransferLedgerRejectWrapper = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 444px;
  justify-content: flex-start;

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
