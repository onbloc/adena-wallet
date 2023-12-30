import mixins from '@styles/mixins';
import { fonts, getTheme } from '@styles/theme';
import styled from 'styled-components';

export const TokenListItemWrapper = styled.div`
  ${mixins.flex({ direction: 'row', justify: 'flex-start' })};
  padding: 13px;
  width: 100%;
  height: auto;
  background: ${getTheme('neutral', '_9')};
  border-radius: 18px;
  transition: 0.2s;

  & + & {
    margin-top: 12px;
  }

  &:hover {
    background: ${getTheme('neutral', '_7')};
    cursor: pointer;
  }

  .logo-wrapper {
    display: inline-flex;
    flex-shrink: 0;
    width: 34px;
    height: 34px;
    margin-right: 12px;

    .logo {
      width: 100%;
      height: 100%;
      border-radius: 50%;
    }
  }

  .name-wrapper {
    display: inline-flex;
    width: 100%;
    flex-shrink: 1;
    align-items: center;
    height: 21px;

    .name {
      display: contents;
      ${fonts.body2Bold};
      line-height: 17px;
    }
  }

  .balance-wrapper {
    display: inline-flex;
    flex-shrink: 0;
    width: fit-content;
    height: 21px;
    line-height: 17px;
    align-items: flex-start;
    justify-content: flex-end;
  }
`;
