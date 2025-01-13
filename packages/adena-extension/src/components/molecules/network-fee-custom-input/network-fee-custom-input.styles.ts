import mixins from '@styles/mixins';
import { fonts, getTheme } from '@styles/theme';
import styled from 'styled-components';

export const NetworkFeeCustomInputWrapper = styled.div`
  ${mixins.flex({ direction: 'row', justify: 'space-between' })};
  width: 100%;
  padding: 14px 16px;
  background-color: ${getTheme('neutral', '_9')};
  border: 1px solid ${getTheme('neutral', '_7')};
  border-radius: 30px;

  & .fee-input {
    ${mixins.flex({ direction: 'row' })};
    width: 100%;
    ${fonts.body2Reg};
  }

  & .denom {
    ${mixins.flex({ direction: 'row' })};
    flex-shrink: 0;
    ${getTheme('neutral', '_1')};
    ${fonts.light13}
  }
`;
