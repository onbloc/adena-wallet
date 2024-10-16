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
    ${fonts.body2Reg};
    background-color: ${getTheme('neutral', '_9')};
    border: 1px solid ${getTheme('neutral', '_7')};
    border-radius: 30px;
    width: 100%;
    resize: none;
  }

  .warning-wrapper {
    ${mixins.flex({ direction: 'row', justify: 'normal' })};
    width: 100%;
    border-radius: 8px;
    border: 1px solid ${getTheme('red', '_8')}0d;
    background-color: ${getTheme('red', '_8')}1a;
    padding: 12px 20px;
    gap: 10px;

    .icon-warning {
      width: 14px;
    }

    .warning-text {
      width: 100%;
      ${fonts.body2Reg};
      color: ${getTheme('red', '_8')};
    }
  }
`;
