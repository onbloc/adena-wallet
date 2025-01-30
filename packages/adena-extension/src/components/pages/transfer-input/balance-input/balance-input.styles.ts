import mixins from '@styles/mixins';
import { fonts, getTheme } from '@styles/theme';
import styled from 'styled-components';

export const BalanceInputWrapper = styled.div`
  ${mixins.flex({ align: 'normal', justify: 'normal' })};
  width: 100%;
  height: auto;

  .input-wrapper {
    ${mixins.flex({ direction: 'row', justify: 'normal' })};
    width: 100%;
    min-height: 48px;
    padding: 12px 16px;
    ${fonts.body2Reg};
    background-color: ${getTheme('neutral', '_9')};
    border: 1px solid ${getTheme('neutral', '_7')};
    border-radius: 30px;

    .amount-input {
      width: 100%;
    }

    .denom {
      margin: 0 8px;
    }

    .max-button {
      display: inline-flex;
      flex-shrink: 0;
      width: 64px;
      height: 24px;
      border-radius: 12px;
      background-color: ${getTheme('neutral', '_7')};
      align-items: center;
      justify-content: center;
      transition: 0.2s;

      &:hover {
        background-color: ${getTheme('neutral', 'b')};
      }
    }
  }

  .description {
    position: relative;
    padding: 0 16px;
    ${fonts.captionReg};
    color: ${getTheme('neutral', 'a')};
  }

  &.error {
    .input-wrapper {
      border-color: ${getTheme('red', '_5')};
    }

    .description {
      color: ${getTheme('red', '_5')};
    }
  }
`;
