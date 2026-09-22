import styled, { css } from 'styled-components';

import mixins from '@styles/mixins';
import { fonts, getTheme } from '@styles/theme';

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
  gap: 10px;
  padding: 14px 3px 3px;
  margin-top: 11px;
  border-top: 1px solid ${getTheme('neutral', '_7')};
`;

// Each row fades in and slides from its own edge — labels from the left, values
// from the right — so the panel reads as widening outward once it has finished
// opening. The stagger is driven by transition-delay rather than by JS timers.
const REVEAL_BASE_DELAY = 180;
const REVEAL_STAGGER = 55;

export const Row = styled.div<{ $open: boolean; $index: number }>`
  ${mixins.flex({ direction: 'row', align: 'center', justify: 'space-between' })};
  width: 100%;
  gap: 8px;

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

export const RowLabel = styled.span`
  ${fonts.captionReg};
  line-height: 15px;
  color: ${getTheme('neutral', 'a')};
  white-space: nowrap;
`;

export const RowValue = styled.span<{ $emphasized?: boolean }>`
  ${fonts.captionReg};
  line-height: 15px;
  color: ${({ $emphasized, theme }): string => ($emphasized ? theme.neutral._1 : theme.neutral._2)};
  text-align: right;
  white-space: nowrap;
`;

export const ProgressTrack = styled.div<{ $open: boolean }>`
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background-color: ${getTheme('neutral', '_7')};
  overflow: hidden;
`;

// Grows from the left in step with the row reveal, so the bar participates in
// the same outward-widening motion rather than appearing at full width.
export const ProgressFill = styled.div<{ $open: boolean; $percent: number }>`
  width: ${({ $open, $percent }): string => ($open ? `${$percent}%` : '0%')};
  height: 100%;
  border-radius: 2px;
  background-color: ${getTheme('primary', '_6')};
  transition: width 420ms cubic-bezier(0.2, 0.8, 0.2, 1);
  transition-delay: ${({ $open }): string => ($open ? '200ms' : '0ms')};

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;
