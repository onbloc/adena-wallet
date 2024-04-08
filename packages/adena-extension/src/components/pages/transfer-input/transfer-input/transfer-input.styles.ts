import mixins from '@styles/mixins';
import { fonts, getTheme } from '@styles/theme';
import styled from 'styled-components';

export const TransferInputWrapper = styled.div`
  ${mixins.flex({ align: 'normal', justify: 'normal' })};
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 444px;
  padding-top: 5px;

  .logo-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 30px 0;
    .logo {
      width: 100px;
      height: 100px;
    }
  }

  .address-input-wrapper {
    display: flex;
    margin-bottom: 12px;
  }

  .balance-input-wrapper {
    display: flex;
    height: 100%;
  }

  .button-group {
    position: absolute;
    display: flex;
    width: 100%;
    bottom: 0;
    justify-content: space-between;

    button {
      width: 100%;
      height: 48px;
      border-radius: 30px;
      ${fonts.body1Bold};
      background-color: ${getTheme('neutral', '_5')};
      transition: 0.2s;

      :hover {
        background-color: ${getTheme('neutral', '_6')};
      }

      &:last-child {
        margin-left: 10px;
      }

      &.next {
        background-color: ${getTheme('primary', '_6')};

        :hover {
          background-color: ${getTheme('primary', '_7')};
        }

        &.disabled {
          color: ${getTheme('neutral', '_5')};
          background-color: ${getTheme('primary', '_9')};
          cursor: default;
        }
      }
    }
  }
`;
