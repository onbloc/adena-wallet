import mixins from '@styles/mixins';
import { fonts, getTheme } from '@styles/theme';
import styled from 'styled-components';

export const TransferSummaryWrapper = styled.div`
  ${mixins.flex({ align: 'normal', justify: 'flex-start' })};
  position: relative;
  width: 100%;
  height: 100%;
  padding-top: 5px;
  min-height: 444px;
  align-items: center;

  .sub-header-wrapper {
    width: 100%;
  }

  .info-wrapper {
    width: 100%;
    margin-top: 25px;
  }

  .direction-icon-wrapper {
    width: 100%;
    text-align: center;
    margin: 10px 0;
  }

  .network-fee-wrapper {
    width: 100%;
    height: 100%;
    margin-top: 20px;

    .error-message {
      position: relative;
      width: 100%;
      padding: 0 16px;
      ${fonts.captionReg};
      color: ${getTheme('red', '_5')};
    }
  }

  .button-group {
    position: absolute;
    display: flex;
    width: 100%;
    bottom: 0;
    justify-content: space-between;

    button {
      width: 100%;
      height: 48px;
      border-radius: 30px;
      ${fonts.body1Bold};
      background-color: ${getTheme('neutral', '_5')};
      transition: 0.2s;

      &:hover {
        background-color: ${getTheme('neutral', '_6')};
      }

      &:last-child {
        margin-left: 10px;
      }

      &.send {
        background-color: ${getTheme('primary', '_6')};

        &:hover {
          background-color: ${getTheme('primary', '_7')};
        }

        &.disabled {
          background-color: ${getTheme('primary', '_9')};
          color: ${getTheme('neutral', '_5')};
          cursor: default;
        }
      }
    }
  }
`;
