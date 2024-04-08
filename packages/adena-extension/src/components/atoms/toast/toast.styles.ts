import styled from 'styled-components';
import { View } from '@components/atoms';
import { fonts } from '@styles/theme';

export const ToastWrapper = styled(View)`
  position: absolute;
  width: 0;
  height: auto;
  top: 40px;
  left: 50%;
  z-index: 97;
  justify-content: center;
  align-items: center;
  opacity: 0;
  transition: 0.5s;
  pointer-events: none;

  &.active {
    opacity: 1;
  }
`;

export const ToastContent = styled(View)`
  width: fit-content;
  flex-shrink: 0;
  padding: 2px 16px;
  color: #fff;
  border-radius: 12.5px;
  background-color: ${({ theme }): string => theme.neutral._9};
  ${fonts.body2Reg}
  white-space: nowrap;
  pointer-events: none;
`;
