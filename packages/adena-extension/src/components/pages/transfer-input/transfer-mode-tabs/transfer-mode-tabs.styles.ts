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
    position: relative;
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

    &.disabled {
      cursor: not-allowed;
    }
  }

  .tab-tooltip {
    position: absolute;
    bottom: calc(100% + 10px);
    left: 50%;
    transform: translateX(-50%);
    padding: 8px 12px;
    background-color: ${getTheme('neutral', '_9')};
    color: ${getTheme('neutral', '_1')};
    font-family: Inter, sans-serif;
    font-size: 14px;
    font-weight: 400;
    line-height: normal;
    border-radius: 12.5px;
    white-space: nowrap;
    pointer-events: none;
    z-index: 10;

    &::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-top: 6px solid ${getTheme('neutral', '_9')};
    }
  }
`;
