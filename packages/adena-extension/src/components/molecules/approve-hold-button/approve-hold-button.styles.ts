import styled, { css, keyframes, RuleSet } from 'styled-components';

const fill = keyframes`
  from {
    width: 0;
  }
  to {
    width: 100%;
  }
`;

export const StyledHoldButton = styled.button<{
  pressed: boolean;
  finish: boolean;
}>`
  position: relative;
  overflow: hidden;
  display: flex;
  width: 100%;
  height: 48px;
  justify-content: center;
  align-items: center;
  border-radius: 30px;
  border: none;
  background-color: ${({ theme }): string => theme.webWarning._100} !important;
  color: ${({ theme }): string => theme.neutral._1} !important;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s;
  text-align: left;

  ${({ pressed, finish }): RuleSet =>
    pressed && !finish
      ? css`
          &::before {
            content: '';
            z-index: 0;
            position: absolute;
            top: 0;
            left: 0;
            height: 100%;
            background: rgba(0, 0, 0, 0.2) !important;
            border-radius: 30px;
            animation: ${fill} 3s linear forwards;
          }
        `
      : css`
          &:hover {
            opacity: 0.9;
          }
        `}
`;

export const StyledButtonContent = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 6px;
`;
