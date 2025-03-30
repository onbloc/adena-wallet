import { View } from '@components/atoms';
import { fonts, getTheme } from '@styles/theme';
import styled from 'styled-components';

export const ArgumentEditBoxWrapper = styled(View)`
  width: 100%;
  max-width: 228px;
  height: 44px;

  .editable-wrapper {
    display: flex;
    flex-direction: row;
    width: 100%;
    height: 100%;
    align-items: center;
    justify-content: space-between;
    gap: 3px;
    border-radius: 30px;
    padding: 8px 10px;
    background-color: ${getTheme('neutral', '_7')};
    ${fonts.body1Reg};

    .edit-input {
      display: flex;
      flex-direction: row;
      width: 100%;
      color: #fff;
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
    padding-right: 18px;

    .display-value {
      display: inline;
      width: 100%;
      text-overflow: ellipsis;
      overflow: hidden;
      text-align: end;
      ${fonts.body1Reg};
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
