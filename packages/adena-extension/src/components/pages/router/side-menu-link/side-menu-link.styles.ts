import styled from 'styled-components';

import { fonts, getTheme } from '@styles/theme';

export const SideMenuLinkWrapper = styled.div`
  display: flex;
  flex-direction: row;
  width: 100%;
  height: auto;
  padding: 16px 20px;
  justify-content: flex-start;
  align-items: center;
  background-color: ${getTheme('neutral', '_9')};
  transition: 0.2s;
  cursor: pointer;

  &:hover {
    background-color: ${getTheme('neutral', '_7')};
  }

  .icon {
    width: 16px;
    height: 16px;
  }

  .title {
    width: 100%;
    margin-left: 12px;
    ${fonts.body2Reg}
  }
`;
