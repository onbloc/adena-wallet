import mixins from '@styles/mixins';
import { fonts } from '@styles/theme';
import styled from 'styled-components';

export const SubHeaderWrapper = styled.div`
  ${mixins.flex({ direction: 'row' })};
  position: relative;
  width: 100%;

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
    ${fonts.header4}
  }
`;
