import mixins from '@styles/mixins';
import { fonts, getTheme } from '@styles/theme';
import styled from 'styled-components';

export const SubHeaderWrapper = styled.div`
  ${mixins.flex({ direction: 'row' })};
  position: relative;
  width: 100%;

  .icon-dropdown {
    path {
      fill: ${getTheme('neutral', 'a')};
    }
  }

  .icon-wrapper {
    position: absolute;
    display: flex;
    width: 24px;
    height: 24px;
    cursor: pointer;
    justify-content: center;
    align-items: center;

    & > * {
      width: 100%;
      height: 100%;
    }

    &.left {
      left: 0;
    }

    &.right {
      right: 0;
    }
  }

  .title-wrapper {
    max-width: calc(100% - 48px - 32px);
    text-overflow: ellipsis;
    display: block;
    white-space: nowrap;
    overflow: hidden;
    ${fonts.header4}
  }
`;
