import { View } from '@components/atoms';
import styled, { css } from 'styled-components';

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
`;
