import { fonts, getTheme } from '@styles/theme';
import styled from 'styled-components';

export const AccountNameInputWrapper = styled.div`
  display: flex;
  flex-direction: row;
  width: 150px;
  height: auto;
  padding: 12.5px 16px;
  background-color: ${getTheme('neutral', '_9')};
  border: 1px solid ${getTheme('neutral', '_7')};
  border-radius: 18px;
  transition: 0.2s;
  justify-content: center;
  align-items: center;

  &.extended {
    width: 100%;
  }

  input {
    display: flex;
    flex-shrink: 1;
    width: 100%;
    overflow: hidden;
    ${fonts.body2Reg}

    &:not(:focus) {
      text-overflow: ellipsis;
    }
  }

  .icon-wrapper {
    display: flex;
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    cursor: pointer;

    svg {
      width: 100%;
      height: 100%;

      * {
        transition: 0.2s;
      }
    }

    &:hover {
      svg * {
        fill: ${getTheme('neutral', '_1')};
      }
    }
  }
`;
