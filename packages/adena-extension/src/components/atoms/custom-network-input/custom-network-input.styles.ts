import styled from 'styled-components';

import mixins from '@styles/mixins';
import { fonts, getTheme } from '@styles/theme';

export const CustomNetworkInputWrapper = styled.div`
  ${mixins.flex({ align: 'normal', justify: 'normal' })};
  width: 100%;
  height: 100%;

  .input-wrapper {
    ${mixins.flex({ align: 'normal', justify: 'normal' })};
    width: 100%;

    .input-box {
      ${mixins.flex({ direction: 'row', justify: 'normal' })};
      width: 100%;
      min-height: 48px;
      padding: 12px 16px;
      ${fonts.body2Reg};
      background-color: ${getTheme('neutral', '_9')};
      border: 1px solid ${getTheme('neutral', '_7')};
      border-radius: 30px;
      margin-top: 12px;

      &:first-child {
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

        &:read-only {
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
