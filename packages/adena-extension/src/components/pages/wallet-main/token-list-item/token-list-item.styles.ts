import mixins from '@styles/mixins';
import { fonts, getTheme } from '@styles/theme';
import styled, { css } from 'styled-components';

// The wrapper is a column so the vesting panel can expand underneath the row
// while both stay inside one rounded, hover-highlighted surface.
export const TokenListItemWrapper = styled.div<{ $disabled?: boolean; $withPrice?: boolean }>`
  ${mixins.flex({ direction: 'column', align: 'stretch', justify: 'flex-start' })};
  padding: 13px;
  width: 100%;
  height: auto;
  background: ${getTheme('neutral', '_9')};
  border-radius: 18px;
  transition: 0.2s;

  & + & {
    margin-top: 12px;
  }

  .item-row {
    ${mixins.flex({ direction: 'row', justify: 'flex-start' })};
    width: 100%;
  }

  ${({ $disabled }): ReturnType<typeof css> =>
    $disabled
      ? css`
          .item-row {
            cursor: default;
          }
        `
      : css`
          &:hover {
            background: ${getTheme('neutral', '_7')};
          }

          .item-row {
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

// Aligned to the bottom of the row so it sits on the amount's line, matching
// the design, rather than centring against the taller two-line cell.
export const VestingToggleButton = styled.button<{ $expanded: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: flex-end;
  flex-shrink: 0;
  width: 16px;
  height: 15px;
  margin-left: 4px;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  color: ${getTheme('neutral', 'a')};

  &:hover {
    color: ${getTheme('neutral', '_1')};
  }

  svg {
    display: block;
    transition: transform 260ms cubic-bezier(0.4, 0, 0.2, 1);
    transform: ${({ $expanded }): string => ($expanded ? 'rotate(180deg)' : 'rotate(0deg)')};
  }

  @media (prefers-reduced-motion: reduce) {
    svg {
      transition: none;
    }
  }
`;
