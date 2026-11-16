import { SkeletonBoxStyle, View } from '@components/atoms';
import styled, { css } from 'styled-components';

export const MainTokenBalanceSkeleton = styled(SkeletonBoxStyle)`
  width: 200px;
  height: 39px;
  border-radius: 10px;
  padding: 0;
`;

export const MainTokenBalanceWrapper = styled(View).withConfig({
  shouldForwardProp: (prop) => prop !== '$compact',
})<{ $compact: boolean }>`
  position: relative;
  width: 100%;
  height: 80px;
  align-items: flex-start;
  justify-content: center;

  ${({ $compact }): ReturnType<typeof css> | false =>
    $compact &&
    css`
      .value.integer,
      .denom {
        font-size: 25px !important;
        line-height: 32px !important;
      }
      .value.decimal {
        font-size: 17px !important;
        line-height: 32px !important;
      }
    `}

  .measure-clone {
    position: absolute;
    visibility: hidden;
    pointer-events: none;
    height: 0;
    overflow: hidden;
    top: 0;
    left: 0;
    white-space: nowrap;
  }

  /* Force natural font sizes on the clone so scrollWidth stays a stable
     reference width regardless of the current $compact state. */
  .measure-clone .value.integer,
  .measure-clone .denom {
    font-size: 32px !important;
    line-height: 39px !important;
  }
  .measure-clone .value.decimal {
    font-size: 24px !important;
    line-height: 39px !important;
  }
`;
