import styled from 'styled-components';

export const ApproveTransactionWrapper = styled.div<{ isErrorNetworkFee: boolean }>`
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'flex-start')};
  padding: 0 20px;
  margin-bottom: 96px;
  align-self: center;

  .row {
    ${({ theme }) => theme.mixins.flexbox('row', 'center', 'center')};
    position: relative;
    padding: 10px 18px;
    justify-content: space-between;
    border-bottom: 2px solid ${({ theme }) => theme.color.neutral[7]};
    ${({ theme }) => theme.fonts.body1Reg};

    &:last-child {
      border-bottom: none;
    }

    .key {
      display: inline-flex;
      width: fit-content;
      flex-shrink: 0;
      color: ${({ theme }) => theme.color.neutral[9]};
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
    ${({ theme }) => theme.mixins.flexbox('row', 'center', 'center')};
    width: 100%;
    min-height: 41px;
    border-radius: 24px;
    padding: 10px 18px;
    margin-bottom: 8px;
    background-color: ${({ theme }) => theme.color.neutral[8]};
    ${({ theme }) => theme.fonts.body2Reg};
  }

  .info-table {
    width: 100%;
    height: auto;
    border-radius: 18px;
    margin-bottom: 8px;
    background-color: ${({ theme }) => theme.color.neutral[8]};
  }

  .fee-amount-wrapper {
    width: 100%;
    min-height: 48px;
    border-radius: 30px;
    padding: 10px 18px;
    margin-bottom: 8px;
    background-color: ${({ theme }) => theme.color.neutral[8]};
    border: 1px solid ${({ theme }) => theme.color.neutral[7]};
    ${({ theme }) => theme.fonts.body2Reg};
    ${({ isErrorNetworkFee, theme }) => isErrorNetworkFee && `border-color: ${theme.color.red[2]};`}
  }

  .error-message {
    position: relative;
    width: 100%;
    padding: 0 16px;
    ${({ theme }) => theme.fonts.captionReg};
    height: 14px;
    margin-top: -5px;
    margin-bottom: 10px;
    color: ${({ theme }) => theme.color.red[2]};
  }

  .transaction-data-wrapper {
    width: 100%;
    ${({ theme }) => theme.fonts.body1Reg};
    ${({ theme }) => theme.mixins.flexbox('column', 'center', 'center')};

    .visible-button {
      color: ${({ theme }) => theme.color.neutral[9]};
      height: fit-content;
      margin-bottom: 5px;

      img {
        margin-left: 3px;
      }
    }
    .textarea-wrapper {
      width: 100%;
      height: 120px;
      border-radius: 24px;
      background-color: ${({ theme }) => theme.color.neutral[8]};
      border: 1px solid ${({ theme }) => theme.color.neutral[6]};
      padding: 12px 16px;
    }
    .raw-info-textarea {
      width: 100%;
      height: 100%;
      overflow: auto;
      ${({ theme }) => theme.fonts.body2Reg};
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
