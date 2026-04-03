import { Row, View } from '@components/atoms';
import mixins from '@styles/mixins';
import { fonts, getTheme } from '@styles/theme';
import styled, { css, RuleSet } from 'styled-components';

export const OptionDropdownWrapper = styled(View)<{ position: 'left' | 'right' }>`
  position: relative;
  width: 24px;
  height: auto;

  .button-wrapper {
    display: flex;
    width: 24px;
    height: 24px;
    border-radius: 24px;
    justify-content: center;
    align-items: center;
    cursor: pointer;

    &:hover {
      background-color: ${getTheme('neutral', '_7')};
    }
  }

  &.opened {
    .button-wrapper {
      background-color: ${getTheme('neutral', '_7')};
    }
  }

  .dropdown-static-wrapper {
    ${mixins.flex()}
    position: absolute;
    min-width: 146px;
    background-color: ${getTheme('neutral', '_8')};
    border: 1px solid ${getTheme('neutral', '_7')};
    border-radius: 12.5px;
    box-shadow: 0px 2px 4px 0px rgba(0, 0, 0, 0.2);
    z-index: 99;
    overflow: hidden;

    ${({ position }): RuleSet | string =>
      position === 'left'
        ? css`
            left: -122px;
            top: 100%;
          `
        : ''}
  }
`;

export const OptionDropdownItemWrapper = styled(Row)`
  width: 100%;
  height: 30px;
  padding: 7px 0 7px 12px;
  gap: 8px;
  justify-content: flex-start;
  align-items: center;
  transition: 0.2s;
  cursor: pointer;

  .item-icon-wrapper {
    display: block;
    width: 12px;
    height: 14px;

    & > svg {
      width: 12px;
      height: 12px;

      &.large {
        width: 14px;
        height: 14px;
      }
    }
  }

  & > .title {
    display: inline-flex;
    width: 100%;
    ${fonts.body3Reg}
  }

  & + & {
    border-top: 1px solid ${getTheme('neutral', '_7')};
  }

  &.selected {
    background-color: ${getTheme('neutral', '_7')};
  }

  &:hover {
    background-color: ${getTheme('neutral', '_7')};
  }
`;
