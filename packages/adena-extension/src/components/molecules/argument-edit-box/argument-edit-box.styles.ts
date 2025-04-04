import { View } from '@components/atoms';
import { fonts, getTheme } from '@styles/theme';
import styled from 'styled-components';

export const ArgumentEditBoxWrapper = styled(View)<{ marginRight?: number }>`
  width: 100%;
  max-width: ${({ marginRight = 0 }): string => `${206 - marginRight}px`};
  height: 44px;
  margin-right: ${({ marginRight = 0 }): string => `${marginRight}px`};

  .editable-wrapper {
    display: flex;
    flex-direction: row;
    width: 100%;
    height: 100%;
    align-items: center;
    justify-content: space-between;
    gap: 3px;
    border-radius: 30px;
    padding: 10px 18px 10px 10px;
    background-color: ${getTheme('neutral', '_7')};
    ${fonts.body2Reg};

    .edit-input {
      display: flex;
      flex-direction: row;
      width: calc(100% - 40px);
      color: #fff;
      ${fonts.body2Reg};
      line-height: 16px;
      margin-right: -18px;
    }

    .button-wrapper {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      gap: 4px;
    }
  }

  .display-wrapper {
    display: flex;
    flex-direction: row;
    width: 100%;
    height: 100%;
    align-items: center;
    justify-content: space-between;
    gap: 3px;

    .display-value {
      display: inline;
      width: 100%;
      text-overflow: ellipsis;
      overflow: hidden;
      text-align: end;
      direction: rtl;
      text-align: right;
      ${fonts.body2Reg};
    }
  }

  .icon-wrapper {
    width: 16px;
    height: 16px;
    cursor: pointer;

    svg {
      &:hover {
        * {
          stroke: ${getTheme('neutral', '_1')};
        }
      }
    }
  }
`;
