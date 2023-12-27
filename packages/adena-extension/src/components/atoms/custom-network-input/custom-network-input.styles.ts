import styled from 'styled-components';

import { fonts, getTheme } from '@styles/theme';

export const CustomNetworkInputWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;

  .input-wrapper {
    display: flex;
    flex-direction: column;
    width: 100%;

    .input-box {
      display: flex;
      flex-direction: row;
      width: 100%;
      min-height: 48px;
      padding: 12px 16px;
      ${fonts.body2Reg};
      background-color: ${getTheme('neutral', '_9')};
      border: 1px solid ${getTheme('neutral', '_7')};
      border-radius: 30px;
      align-items: center;
      margin-top: 12px;

      :first-child {
        margin-top: 0;
      }

      input {
        display: flex;
        width: 100%;
        height: auto;
        resize: none;
        overflow: hidden;
        line-height: 25px;

        ::placeholder {
          color: ${getTheme('neutral', 'a')};
        }
      }
    }
  }

  .error-message {
    position: relative;
    padding: 0 16px;
    ${fonts.captionReg};
    height: 14px;
    color: ${getTheme('red', '_5')};
  }
`;
