import { SkeletonBoxStyle, View } from '@components/atoms';
import theme, { fonts, getTheme } from '@styles/theme';
import styled, { css } from 'styled-components';

export const MainTotalPriceSkeleton = styled(SkeletonBoxStyle)`
  width: 200px;
  height: 39px;
  border-radius: 10px;
  padding: 0;
`;

export const MainTotalPriceWrapper = styled(View).withConfig({
  shouldForwardProp: (prop) => prop !== '$compact',
})<{ $compact: boolean }>`
  position: relative;
  width: 100%;
  height: 80px;
  align-items: flex-start;
  justify-content: center;
  gap: 8px;

  .total-value {
    font-weight: 600;
    font-size: 32px;
    line-height: 39px;
    color: ${getTheme('neutral', '_1')};
    white-space: nowrap;
  }

  /* A long total drops a size rather than overflowing the popup width. */
  ${({ $compact }): ReturnType<typeof css> | false =>
    $compact &&
    css`
      .total-value {
        font-size: 25px;
        line-height: 32px;
      }
    `}

  .change-wrapper {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 7px;
    height: 21px;
  }

  .change-value {
    ${fonts.body2Reg};
    line-height: normal;
  }

  .change-value.positive {
    color: ${theme.green._5};
  }

  .change-value.negative {
    color: ${theme.red._5};
  }

  .change-value.neutral {
    color: ${theme.neutral.a};
  }

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

  /* Natural size on the clone keeps scrollWidth stable across $compact flips. */
  .measure-clone .total-value {
    font-size: 32px;
    line-height: 39px;
  }
`;
