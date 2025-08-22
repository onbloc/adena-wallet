import mixins from '@styles/mixins';
import { fonts, getTheme } from '@styles/theme';
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

interface TooltipBoxWrapperProps {
  $position?: TooltipPosition;
  $arrowPosition?: ArrowPosition;
}

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
  background-color: ${getTheme('neutral', '_8')};
  width: 300px;
  height: auto;
  border-radius: 8px;
  padding: 16px;
  color: ${getTheme('neutral', '_2')};
  ${fonts.body2Reg};
  cursor: default;
  z-index: 9999;

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
    border-top: 14px solid ${getTheme('neutral', '_8')};
    border-radius: 0 0 4px 4px;
  }
`;
