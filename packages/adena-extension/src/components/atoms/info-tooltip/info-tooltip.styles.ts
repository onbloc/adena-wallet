import mixins from '@styles/mixins';
import { fonts } from '@styles/theme';
import styled from 'styled-components';

export const InfoTooltipContainer = styled.div`
  position: relative;
  ${mixins.flex({ direction: 'row' })};
  cursor: pointer;
`;

interface TooltipPosition {
  left?: number;
  right?: number;
  top?: number;
  transform?: string;
}

interface ArrowPosition {
  left: string;
  transform: string;
}

export type InfoTooltipVariant = 'default' | 'popover';

interface TooltipBoxWrapperProps {
  $position?: TooltipPosition;
  $arrowPosition?: ArrowPosition;
  $variant?: InfoTooltipVariant;
}

// 'popover' matches the header hover popups (address-copy / session overview):
// neutral._9 surface, drop shadow, 12px text, tighter padding. 'default' keeps
// the original lighter neutral._8 tooltip used elsewhere.
export const InfoTooltipTooltipBoxWrapper = styled.div<TooltipBoxWrapperProps>`
  position: ${({ $position }): string => ($position?.left !== undefined ? 'fixed' : 'absolute')};
  bottom: ${({ $position }): string =>
    $position?.left !== undefined ? 'auto' : 'calc(100% + 14px)'};
  top: ${({ $position }): string => ($position?.top !== undefined ? `${$position.top}px` : 'auto')};
  left: ${({ $position }): string =>
    $position?.left !== undefined ? `${$position.left}px` : '50%'};
  right: ${({ $position }): string =>
    $position?.right !== undefined ? `${$position.right}px` : 'auto'};
  transform: ${({ $position }): string => $position?.transform || 'translate(-50%, -100%)'};
  width: ${({ $variant }): string => ($variant === 'popover' ? '320px' : '300px')};
  max-width: ${({ $variant }): string => ($variant === 'popover' ? '320px' : '300px')};
  height: auto;
  border-radius: 8px;
  cursor: default;
  z-index: 9999;

  background-color: ${({ $variant, theme }): string =>
    $variant === 'popover' ? theme.neutral._9 : theme.neutral._8};
  padding: ${({ $variant }): string => ($variant === 'popover' ? '10px' : '16px')};
  color: ${({ $variant, theme }): string =>
    $variant === 'popover' ? theme.neutral._1 : theme.neutral._2};
  box-shadow: ${({ $variant }): string =>
    $variant === 'popover' ? '0px 4px 12px rgba(0, 0, 0, 0.3)' : 'none'};
  ${({ $variant }): typeof fonts.body2Reg =>
    $variant === 'popover' ? fonts.body3Reg : fonts.body2Reg};

  &::after {
    content: '';
    position: absolute;
    bottom: -14px;
    left: ${({ $arrowPosition }): string => $arrowPosition?.left || '50%'};
    transform: ${({ $arrowPosition }): string => $arrowPosition?.transform || 'translateX(-50%)'};
    width: 0;
    height: 0;
    border-left: 12.5px solid transparent;
    border-right: 12.5px solid transparent;
    border-top: 14px solid
      ${({ $variant, theme }): string =>
        $variant === 'popover' ? theme.neutral._9 : theme.neutral._8};
    border-radius: 0 0 4px 4px;
  }
`;

// Semi Bold emphasis inside a tooltip, matching the Figma "Master Account" runs.
export const InfoTooltipStrong = styled.span`
  font-weight: 600;
`;
