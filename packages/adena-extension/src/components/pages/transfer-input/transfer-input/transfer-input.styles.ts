import theme, { fonts } from '@styles/theme';
import styled from 'styled-components';

export const TransferInputWrapper = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
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
      background-color: ${theme.color.neutral[4]};
      transition: 0.2s;

      :hover {
        background-color: ${theme.color.neutral[5]};
      }

      &:last-child {
        margin-left: 10px;
      }

      &.next {
        background-color: ${theme.color.primary[3]};

        :hover {
          background-color: ${theme.color.primary[4]};
        }

        &.disabled {
          color: ${theme.color.neutral[4]};
          background-color: ${theme.color.primary[6]};
          cursor: default;
        }
      }
    }
  }
`;
