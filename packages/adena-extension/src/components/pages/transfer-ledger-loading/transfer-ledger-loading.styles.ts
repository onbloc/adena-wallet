import mixins from '@styles/mixins';
import styled from 'styled-components';

export const TransferLedgerLoadingWrapper = styled.div`
  ${mixins.flex({ align: 'normal', justify: 'flex-start' })};
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 444px;

  @keyframes rotate {
    from {
      -webkit-transform: rotate(0deg);
      -o-transform: rotate(0deg);
      transform: rotate(0deg);
    }
    to {
      -webkit-transform: rotate(360deg);
      -o-transform: rotate(360deg);
      transform: rotate(360deg);
    }
  }

  .icon {
    width: 100px;
    height: 100px;
    margin: 20px auto;
    animation: rotate 1.5s infinite;
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
