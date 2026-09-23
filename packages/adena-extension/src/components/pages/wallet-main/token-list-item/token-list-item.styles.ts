import mixins from '@styles/mixins';
import { fonts, getTheme } from '@styles/theme';
import styled, { css } from 'styled-components';

export const TokenListItemWrapper = styled.div<{ $disabled?: boolean; $withPrice?: boolean }>`
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

  ${({ $disabled }): ReturnType<typeof css> =>
    $disabled
      ? css`
          cursor: default;
        `
      : css`
          &:hover {
            background: ${getTheme('neutral', '_7')};
            cursor: pointer;
          }
        `}

  .logo-wrapper {
    display: inline-flex;
    flex-shrink: 0;
    width: 34px;
    height: 34px;
    margin-right: 12px;
  }

  .name-wrapper {
    display: inline-flex;
    width: 100%;
    flex-shrink: 1;
    align-items: center;
    justify-content: space-between;
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

  /* Priced rows stack two lines per side and match the icon's full height. */
  ${({ $withPrice }): ReturnType<typeof css> | false =>
    !!$withPrice &&
    css`
      .name-wrapper {
        flex-direction: column;
        align-items: flex-start;
        justify-content: center;
        height: 34px;

        .name {
          display: block;
          ${fonts.body2Bold};
          line-height: 15px;
        }
      }

      .balance-wrapper {
        height: 34px;
        align-items: flex-end;
      }
    `}
`;
