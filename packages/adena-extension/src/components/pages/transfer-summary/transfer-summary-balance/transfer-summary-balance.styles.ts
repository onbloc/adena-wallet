import mixins from '@styles/mixins';
import { fonts, getTheme } from '@styles/theme';
import styled from 'styled-components';

export const TransferSummaryBalanceWrapper = styled.div`
  ${mixins.flex({ direction: 'row', justify: 'flex-start', align: 'center' })};
  width: 100%;
  height: 60px;
  padding: 0 16px;
  gap: 12px;
  background-color: ${getTheme('neutral', '_9')};
  border-radius: 18px;

  .token-icon-wrapper {
    position: relative;
    width: 34px;
    height: 34px;
    flex-shrink: 0;
  }

  .token-image {
    width: 100%;
    height: 100%;
    border-radius: 50%;
  }

  .chain-badge {
    position: absolute;
    right: -1.5px;
    bottom: -1.5px;
    width: 13px;
    height: 13px;
    border-radius: 3px;
    border: 1.5px solid ${getTheme('neutral', '_9')};
    background-color: ${getTheme('neutral', '_9')};
  }

  /* A large amount and its USD value can outgrow the 360px popup, so the name
     truncates, and the USD value wraps under the amount before truncating. */
  .chain-name {
    flex: 0 1 auto;
    min-width: 40px;
    color: ${getTheme('neutral', '_1')};
    ${fonts.body2Bold};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .balance-wrapper {
    margin-left: auto;
    min-width: 0;
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }

  .transfer-amount {
    flex-wrap: wrap;
    justify-content: flex-end;
    min-width: 0;
    max-width: 100%;

    .fee-amount-usd {
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
`;
