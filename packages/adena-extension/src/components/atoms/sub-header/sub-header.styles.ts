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

  /*
   * The popup sizes itself to its content, and a percentage max-width is
   * ignored while that width is still being worked out — so a nowrap title
   * contributed its full text width and stretched the whole popup (an NFT name
   * long enough took it from 360px to ~990px).
   *
   * A zero flex basis contributes nothing to that calculation: the title takes
   * whatever the header has and ellipsizes inside it. The padding keeps the
   * text clear of the 24px icons the wrapper positions at either edge, which is
   * what the old calc(100% - 56px) was reserving.
   */
  .title-wrapper {
    flex: 1 1 0;
    min-width: 0;
    width: 0;
    padding: 0 28px;
    text-align: center;
    text-overflow: ellipsis;
    display: block;
    white-space: nowrap;
    overflow: hidden;
    ${fonts.header4}
  }
`;
