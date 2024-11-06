import mixins from '@styles/mixins';
import { fonts, getTheme } from '@styles/theme';
import styled from 'styled-components';

export const ManageTokenListWrapper = styled.div`
  ${mixins.flex({ align: 'normal', justify: 'normal' })};
  width: 100%;
  height: auto;
`;

export const ManageTokenListItemWrapper = styled.div`
  ${mixins.flex({ direction: 'row', justify: 'flex-start' })};
  padding: 10px 14px;
  width: 100%;
  height: auto;
  background: ${getTheme('neutral', '_9')};
  border-radius: 18px;
  transition: 0.2s;

  & + & {
    margin-top: 12px;
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

      &.empty {
        background-color: ${getTheme('neutral', '_7')};
      }
    }

    .icon-empty {
      display: block;
      width: 20px;
      height: 100%;
      margin: auto;
    }

    &.square {
      .logo {
        border-radius: 8px;
      }
    }
  }

  .name-wrapper {
    display: inline-flex;
    flex-direction: column;
    margin-top: 4px;
    height: 35px;
    white-space: pre;
    justify-content: space-between;

    .name {
      ${fonts.body2Bold};
      line-height: 15px;
    }

    .balance {
      color: ${getTheme('neutral', 'a')};
      ${fonts.captionReg};
    }
  }

  .toggle-wrapper {
    display: inline-flex;
    width: 100%;
    height: auto;
    align-items: flex-start;
    justify-content: flex-end;
  }
`;
