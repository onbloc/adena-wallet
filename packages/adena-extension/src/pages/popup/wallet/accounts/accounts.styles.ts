import styled from 'styled-components';

import mixins from '@styles/mixins';
import { fonts, getTheme } from '@styles/theme';

export const AccountsWrapper = styled.main`
  ${mixins.flex({ direction: 'column', align: 'stretch', justify: 'flex-start' })};
  width: 100%;
  height: 100%;
  padding-bottom: 24px;

  .list {
    width: calc(100% + 40px);
    margin: 0 -20px;
  }
`;

export const AddAccountButton = styled.button`
  ${mixins.flex({ direction: 'row', align: 'center', justify: 'center' })};
  gap: 8px;
  width: fit-content;
  margin: 12px auto 0;
  padding: 0;
  background: none;
  border: none;
  color: ${getTheme('neutral', 'a')};
  cursor: pointer;
  transition: color 0.2s ease;

  span {
    ${fonts.body1Reg};
    color: inherit;
  }

  svg {
    color: inherit;
  }

  &:hover {
    color: ${getTheme('neutral', '_1')};
  }
`;
