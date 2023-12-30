import mixins from '@styles/mixins';
import { fonts, getTheme } from '@styles/theme';
import styled from 'styled-components';

export const AdditionalTokenSelectBoxWrapper = styled.div`
  ${mixins.flex({ align: 'normal', justify: 'normal' })};
  position: relative;
  width: 100%;
  height: 48px;

  .fixed-wrapper {
    ${mixins.flex({ align: 'normal', justify: 'normal' })};
    position: relative;
    width: 100%;
    height: auto;
    min-height: 48px;
    border-radius: 30px;
    border: 1px solid ${getTheme('neutral', '_7')};
    background-color: ${getTheme('neutral', '_9')};
    overflow: hidden;
    z-index: 2;

    &.opened {
      position: absolute;
      border-radius: 18px;
      margin-bottom: 48px;
    }
  }

  .select-box {
    display: flex;
    width: 100%;
    height: 48px;
    padding: 13px;
    cursor: pointer;
    user-select: none;

    .title {
      width: 100%;
      padding: 0 4px;
      ${fonts.body2Reg};
      color: ${getTheme('neutral', 'a')};
    }

    .icon-wrapper {
      display: inline-flex;
      width: 20px;
      height: 20px;
    }

    &.selected {
      .title {
        color: ${getTheme('neutral', '_1')};
      }
    }
  }

  .list-wrapper {
    .search-input-wrapper {
      height: 48px;
      padding: 4px 5px;
      border-top: 1px solid ${getTheme('neutral', '_7')};

      & > * {
        background-color: ${getTheme('neutral', '_7')};
      }
    }
  }
`;
