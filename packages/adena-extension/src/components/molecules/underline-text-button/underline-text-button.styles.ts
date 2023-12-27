import styled from 'styled-components';

import { fonts, getTheme } from '@styles/theme';

export const UnderlineTextButtonWrapper = styled.div`
  display: flex;
  flex-direction: row;
  flex-shrink: 0;
  width: 180px;
  height: 24px;
  margin: 24px auto;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: 0.2s;

  &:hover {
    opacity: 0.7;
  }

  .title {
    color: ${getTheme('neutral', 'a')};
    ${fonts.body1Reg};
    white-space: pre;
    text-decoration: underline;
  }
`;
