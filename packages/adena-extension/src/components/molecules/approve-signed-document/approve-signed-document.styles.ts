import styled from 'styled-components';

import mixins from '@styles/mixins';
import { fonts, getTheme } from '@styles/theme';

export const ApproveSignedDocumentWrapper = styled.div<{ isErrorNetworkFee: boolean }>`
  ${mixins.flex({ justify: 'flex-start' })};
  width: 100%;
  padding: 0 20px;
  padding-bottom: 96px;
  align-self: center;

  .row {
    ${mixins.flex({ direction: 'row' })};
    position: relative;
    padding: 10px 18px;
    justify-content: space-between;
    border-bottom: 2px solid ${getTheme('neutral', '_8')};
    ${fonts.body1Reg};

    &:last-child {
      border-bottom: none;
    }

    .key {
      display: inline-flex;
      width: fit-content;
      flex-shrink: 0;
      color: ${getTheme('neutral', 'a')};
    }

    .value {
      display: block;
      max-width: 204px;
      text-align: right;
      text-overflow: ellipsis;
      overflow: hidden;
    }
  }

  .main-title {
    text-overflow: ellipsis;
    margin-top: 24px;
    overflow: hidden;
    white-space: nowrap;
    width: 100%;
    text-align: center;
  }

  .logo-wrapper {
    margin: 24px auto;
    width: 100%;
    height: auto;
    text-align: center;

    img {
      width: 80px;
      height: 80px;
    }
  }

  .domain-wrapper {
    ${mixins.flex({ direction: 'row', align: 'center', justify: 'center' })};
    width: 100%;
    min-height: 41px;
    border-radius: 24px;
    padding: 10px 18px;
    margin: 24px auto 12px auto;
    gap: 7px;
    background-color: ${getTheme('neutral', '_9')};
    ${fonts.body2Reg};

    .logo {
      width: 20px;
      height: 20px;
      border-radius: 50%;
    }
  }

  .info-table {
    width: 100%;
    height: auto;
    border-radius: 18px;
    margin-bottom: 8px;
    background-color: ${getTheme('neutral', '_9')};
  }

  .memo-wrapper {
    width: 100%;
    min-height: 48px;
    border-radius: 30px;
    padding: 10px 18px;
    margin-bottom: 8px;
    background-color: ${getTheme('neutral', '_9')};
    border: 1px solid ${getTheme('neutral', '_8')};
    gap: 10px;
    ${fonts.body2Reg};

    span.value {
      display: block;
      width: 100%;
      max-width: 100%;
      height: auto;
      word-break: break-all;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    input.value {
      display: block;
      width: 100%;
      max-width: 100%;
      height: auto;

      &::placeholder {
        color: ${getTheme('neutral', 'a')};
      }
    }

    &.editable {
      border: 1px solid ${getTheme('neutral', '_7')};
    }
  }

  .fee-amount-wrapper {
    ${mixins.flex({ justify: 'flex-start' })};
    width: 100%;
    gap: 8px;
    margin-bottom: 8px;
  }

  .error-message {
    position: relative;
    width: 100%;
    padding: 0 16px;
    ${fonts.captionReg};
    color: ${getTheme('red', '_5')};
    white-space: pre-line;
  }

  .transaction-data-wrapper {
    width: 100%;
    ${fonts.body2Reg};
    ${mixins.flex()};

    .visible-button {
      color: ${getTheme('neutral', 'a')};
      height: fit-content;
      margin-bottom: 5px;

      img {
        margin-left: 3px;
      }
    }
    .textarea-wrapper {
      width: 100%;
      height: 200px;
      border-radius: 24px;
      background-color: ${getTheme('neutral', '_9')};
      border: 1px solid ${getTheme('neutral', '_7')};
      padding: 12px 16px;
    }
    .raw-info-textarea {
      width: 100%;
      height: 100%;
      overflow: auto;
      ${fonts.body2Reg};
      resize: none;
    }
    .raw-info-textarea::-webkit-scrollbar {
      width: 2px;
      padding: 1px 1px 1px 0px;
      margin-right: 10px;
    }

    .raw-info-textarea::-webkit-scrollbar-thumb {
      background-color: darkgrey;
    }

    .raw-info-textarea::-webkit-resizer {
      display: none !important;
    }

    margin-bottom: 20px;
  }
`;
