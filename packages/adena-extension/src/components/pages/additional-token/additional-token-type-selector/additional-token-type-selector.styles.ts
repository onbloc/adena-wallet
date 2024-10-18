import { Row, View } from '@components/atoms';
import { fonts, getTheme } from '@styles/theme';
import styled from 'styled-components';

export const StyledAdditionalTokenTypeSelectorWrapper = styled(Row)`
  display: flex;
  width: 100%;
  height: 48px;
  padding: 5px;
  gap: 10px;
  justify-content: center;
  align-items: center;
  border-radius: 30px;
  background-color: ${getTheme('neutral', '_9')};
`;

export const StyledAdditionalTokenTypeSelector = styled(View)`
  display: flex;
  width: 100%;
  height: 100%;
  justify-content: center;
  align-items: center;
  border-radius: 30px;
  color: ${getTheme('neutral', 'a')};
  ${fonts.body2Reg}
  cursor: pointer;

  &.selected {
    color: ${getTheme('neutral', '_1')};
    background-color: ${getTheme('neutral', '_7')};
  }
`;
