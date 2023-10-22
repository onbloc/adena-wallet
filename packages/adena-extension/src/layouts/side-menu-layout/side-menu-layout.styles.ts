import styled from 'styled-components';

export const SideMenuOverlay = styled.div<{ open: boolean }>`
  position: fixed;
  z-index: 10;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transition: 0.4s;
  background-color: rgba(255, 255, 255, 0.05);
  opacity: ${({ open }) => (open ? 1 : 0)};
  visibility: ${({ open }) => (open ? 'visible' : 'hidden')};
  -webkit-backdrop-filter: blur(20px);
  -moz-backdrop-filter: blur(20px);
  -o-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
  z-index: 98;
`;

export const SideMenuBackground = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background-color: ${({ theme }) => theme.dimmed400};
`;

export const SideMenuContent = styled.div<{ open: boolean }>`
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'space-between')};
  background-color: ${({ theme }) => theme.color.neutral[7]};
  position: fixed;
  top: 0px;
  left: ${({ open }) => (open ? '0px' : '-100%')};
  width: 270px;
  height: 100%;
  z-index: 99;
  transition: left 0.4s ease;
`;