import { getTheme } from '@styles/theme';
import styled from 'styled-components';

export const TransferModeTabsWrapper = styled.div`
  display: flex;
  flex-direction: row;
  align-items: stretch;
  width: 100%;
  padding: 4px;
  background-color: ${getTheme('neutral', '_9')};
  border-radius: 30px;

  .tab {
    display: flex;
    flex: 1 1 0;
    min-width: 0;
    height: 32px;
    padding: 0 16px;
    align-items: center;
    justify-content: center;
    border-radius: 30px;
    cursor: pointer;
    background-color: transparent;
    color: ${getTheme('neutral', 'a')};
    text-align: center;
    font-family: Inter, sans-serif;
    font-size: 13px;
    font-weight: 500;
    line-height: normal;
    transition:
      background-color 0.15s ease,
      color 0.15s ease;
    user-select: none;

    &.active {
      background-color: ${getTheme('neutral', '_7')};
      color: ${getTheme('neutral', '_1')};
    }
  }
`;
