import mixins from '@styles/mixins';
import { fonts, getTheme } from '@styles/theme';
import styled from 'styled-components';

export const MemoInputWrapper = styled.div`
  ${mixins.flex({ align: 'normal', justify: 'normal' })};
  width: 100%;
  height: auto;
  gap: 12px;

  .memo-input {
    ${mixins.flex({ direction: 'row', justify: 'normal' })};
    width: 100%;
    height: auto;
    padding: 12px 16px;
    background-color: ${getTheme('neutral', '_9')};
    border: 1px solid ${getTheme('neutral', '_7')};
    border-radius: 30px;
    resize: none;

    ${fonts.body2Reg};

    &.error {
      border-color: ${getTheme('red', '_5')};
    }
  }

  .warning-wrapper {
    ${mixins.flex({ direction: 'row', justify: 'normal', align: 'flex-start' })};
    width: 100%;
    border-radius: 8px;
    border: 1px solid ${getTheme('red', '_8')}0d;
    background-color: ${getTheme('red', '_8')}1a;
    padding: 12px 20px;
    gap: 8px;

    .icon-warning {
      width: 14px;
      padding: 4px 0;
    }

    .warning-text {
      width: 100%;
      ${fonts.body2Reg};
      color: ${getTheme('red', '_8')};
    }
  }

  .error-message {
    position: relative;
    margin-top: -10px;
    padding: 0 16px;
    ${fonts.captionReg};
    font-size: 13px;
    color: ${getTheme('red', '_5')};
  }
`;
