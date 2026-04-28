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

  .chain-name {
    flex-shrink: 0;
    color: ${getTheme('neutral', '_1')};
    ${fonts.body2Bold};
  }

  .balance-wrapper {
    margin-left: auto;
    display: flex;
    align-items: center;
  }
`;
