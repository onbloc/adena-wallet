import styled, { css } from 'styled-components';

import mixins from '@styles/mixins';
import { fonts } from '@styles/theme';

// Design tokens local to the vesting panel — none of these exist in the theme
// palette, and rounding them to the nearest token visibly shifts the design.
const LABEL_COLOR = '#9BA0A8';
const TRACK_COLOR = '#33363C';
const VESTED_COLOR = '#3EDB9C';

// Opening animates `grid-template-rows` from 0fr to 1fr, which transitions to
// the content's natural height without hard-coding one — `height: auto` is not
// animatable. The inner track needs `min-height: 0` for the 0fr state to
// actually collapse.
export const PanelCollapse = styled.div<{ $open: boolean }>`
  display: grid;
  width: 100%;
  grid-template-rows: ${({ $open }): string => ($open ? '1fr' : '0fr')};
  transition: grid-template-rows 260ms cubic-bezier(0.4, 0, 0.2, 1);

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const PanelClip = styled.div`
  overflow: hidden;
  min-height: 0;
`;

export const PanelBody = styled.div`
  ${mixins.flex({ direction: 'column', align: 'stretch', justify: 'flex-start' })};
  width: 100%;
  gap: 9px;
  margin-top: 16px;
`;

// Each row fades in and slides from its own edge — labels from the left, values
// from the right — so the panel reads as widening outward once it has finished
// opening. The stagger is driven by transition-delay rather than by JS timers.
const REVEAL_BASE_DELAY = 180;
const REVEAL_STAGGER = 55;

const revealMotion = css<{ $open: boolean; $index: number }>`
  > * {
    transition:
      opacity 220ms ease,
      transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
    transition-delay: ${({ $open, $index }): string =>
      $open ? `${REVEAL_BASE_DELAY + $index * REVEAL_STAGGER}ms` : '0ms'};
  }

  ${({ $open }): ReturnType<typeof css> =>
    $open
      ? css`
          > * {
            opacity: 1;
            transform: translateX(0);
          }
        `
      : css`
          > *:first-child {
            opacity: 0;
            transform: translateX(-10px);
          }
          > *:last-child {
            opacity: 0;
            transform: translateX(10px);
          }
        `}

  @media (prefers-reduced-motion: reduce) {
    > * {
      transition: none;
      transform: none;
      opacity: 1;
    }
  }
`;

export const Row = styled.div<{ $open: boolean; $index: number }>`
  ${mixins.flex({ direction: 'row', align: 'center', justify: 'space-between' })};
  width: 100%;
  gap: 8px;
  ${revealMotion};
`;

// Label side of a row: an optional leading mark (padlock, status dot) sitting
// on the same baseline as the text.
export const RowLabel = styled.span`
  ${fonts.captionReg};
  display: inline-flex;
  align-items: center;
  gap: 6px;
  line-height: 13px;
  color: ${LABEL_COLOR};
  white-space: nowrap;

  svg {
    display: block;
    flex-shrink: 0;
  }
`;

export const RowValue = styled.span<{ $tone: 'primary' | 'muted' | 'vested' }>`
  ${fonts.captionReg};
  line-height: 13px;
  text-align: right;
  white-space: nowrap;
  color: ${({ $tone, theme }): string => {
    if ($tone === 'muted') return theme.neutral.a;
    if ($tone === 'vested') return VESTED_COLOR;
    return theme.neutral._1;
  }};
`;

export const StatusDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: ${VESTED_COLOR};
  flex-shrink: 0;
`;

export const ProgressTrack = styled.div`
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background-color: ${TRACK_COLOR};
  overflow: hidden;
`;

// Grows from the left in step with the row reveal, so the bar participates in
// the same outward-widening motion rather than appearing at full width.
export const ProgressFill = styled.div<{ $open: boolean; $percent: number }>`
  width: ${({ $open, $percent }): string => ($open ? `${$percent}%` : '0%')};
  height: 100%;
  border-radius: 3px;
  background-color: ${VESTED_COLOR};
  transition: width 420ms cubic-bezier(0.2, 0.8, 0.2, 1);
  transition-delay: ${({ $open }): string => ($open ? '200ms' : '0ms')};

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

// The bar is one element in the reveal sequence, so it gets the same motion as
// a row but without the two-sided label/value split.
export const ProgressRow = styled.div<{ $open: boolean; $index: number }>`
  width: 100%;
  ${revealMotion};

  > * {
    transform-origin: left center;
  }

  ${({ $open }): ReturnType<typeof css> | false =>
    !$open &&
    css`
      > *:first-child {
        opacity: 0;
        transform: translateX(-10px);
      }
    `}
`;
