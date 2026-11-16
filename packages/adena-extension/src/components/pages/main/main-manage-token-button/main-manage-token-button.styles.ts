import mixins from '@styles/mixins';
import { fonts, getTheme } from '@styles/theme';
import styled from 'styled-components';

export const MainManageTokenButtonWrapper = styled.button`
  ${mixins.flex({ direction: 'row' })};
  flex-shrink: 0;
  width: 156px;
  height: 24px;
  padding: 0;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: 0.2s;

  &:hover {
    opacity: 0.7;
  }

  &:disabled {
    cursor: default;
    opacity: 0.5;
  }

  &:disabled:hover {
    opacity: 0.5;
  }

  .icon {
    width: 24px;
    height: 24px;
    margin-right: 5px;
  }

  .title {
    color: ${getTheme('neutral', 'a')};
    ${fonts.body1Reg};
  }
`;
