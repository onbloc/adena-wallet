import mixins from '@styles/mixins';
import { fonts, getTheme } from '@styles/theme';
import styled from 'styled-components';

export const TransferSummaryWrapper = styled.div`
  ${mixins.flex({ align: 'normal', justify: 'flex-start' })};
  position: relative;
  padding: 24px 20px 0;
  width: 100%;
  height: 100%;
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
    margin-top: 20px;

    .error-message {
      position: relative;
      width: 100%;
      padding: 0 16px;
      ${fonts.captionReg};
      font-size: 13px;
      color: ${getTheme('red', '_5')};
    }
  }

  .simulate-error-banner {
    width: 100%;
    padding: 10px 16px;
    border-radius: 18px;
    background-color: rgba(239, 45, 33, 0.08);
    border: 1px solid ${getTheme('red', '_5')};
    margin-top: 8px;
    font-family: 'Poppins', sans-serif;
    font-weight: 500;
    font-size: 13px;
    line-height: 20px;
    color: ${getTheme('red', '_5')};
    word-break: break-word;
    overflow-wrap: break-word;

    .error-label {
      font-weight: 700;
    }
  }

  .bottom-spacer {
    width: 100%;
    height: 96px;
    flex-shrink: 0;
  }
`;
