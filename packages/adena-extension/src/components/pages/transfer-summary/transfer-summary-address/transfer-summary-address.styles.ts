import { fonts, getTheme } from '@styles/theme';
import styled from 'styled-components';

export const TransferSummaryAddressWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 0 18px;
  ${fonts.body1Reg};
  background-color: ${getTheme('neutral', '_9')};
  border-radius: 18px;

  .row {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    height: 46px;
    border-top: 1px solid ${getTheme('neutral', '_6')};
  }

  .row:first-child {
    border-top: none;
  }

  .row .label {
    flex-shrink: 0;
    color: ${getTheme('neutral', 'a')};
  }

  .row .value {
    color: ${getTheme('neutral', '_1')};
    text-align: right;
    margin-left: 12px;
    overflow: hidden;
    word-break: break-all;
  }

  .memo-row {
    min-height: 46px;
    height: auto;
    align-items: flex-start;
    padding: 11px 0;
  }

  .memo-row .label {
    line-height: 24px;
  }

  .memo-row .memo-value {
    line-height: 24px;
    word-break: break-word;
    white-space: pre-wrap;
  }

  .memo-row .memo-empty {
    color: ${getTheme('neutral', 'a')};
  }
`;
