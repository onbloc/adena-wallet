import styled from 'styled-components';

import { Pressable, Row, View } from '@components/atoms';
import { fonts, getTheme } from '@styles/theme';

export const StyledWrapper = styled(View)`
  width: 100%;
  gap: 12px;
`;

export const StyledTableWrapper = styled(View)`
  width: 100%;
  border-radius: 18px;
  background: ${({ theme }): string => theme.neutral._9};
`;

export const StyledResultRow = styled(Row)`
  width: 100%;
  justify-content: space-between;
  align-items: center;
  height: 40px;
  padding: 0 18px;
  border-bottom: 2px solid ${({ theme }): string => theme.neutral._8};

  &:last-child {
    border-bottom: none;
  }
`;

export const StyledResultColumnName = styled(Row)`
  flex-shrink: 0;
  color: ${({ theme }): string => theme.neutral.a};
  justify-content: flex-start;
  align-items: center;
  ${fonts.body1Reg};
`;

export const StyledResultColumnValue = styled(Row)`
  gap: 5px;
  color: ${({ theme }): string => theme.neutral._1};
  justify-content: flex-end;
  align-items: center;
  ${fonts.body1Reg};
`;

export const StyledInfoWrapper = styled(View)`
  gap: 8px;
  color: ${({ theme }): string => theme.neutral._1};
  justify-content: flex-end;
  align-items: center;
  ${fonts.body1Reg};
`;

export const StyledInfoButton = styled(Pressable)`
  flex-direction: row;
  gap: 4px;
  color: ${({ theme }): string => theme.neutral._1};
  justify-content: center;
  align-items: center;
`;

export const StyledTransactionAreaWrapper = styled(View)`
  width: 100%;
  height: 200px;
  border-radius: 24px;
  background-color: ${getTheme('neutral', '_9')};
  border: 1px solid ${getTheme('neutral', '_7')};
  padding: 12px 16px;
`;

export const StyledTransactionArea = styled.textarea`
  ${fonts.body1Reg};
  width: 100%;
  height: 100%;
  overflow: auto;
  ${fonts.body2Reg};
  resize: none;

  &::-webkit-scrollbar {
    width: 2px;
    padding: 1px 1px 1px 0px;
    margin-right: 10px;
  }

  &::-webkit-scrollbar-thumb {
    background-color: darkgrey;
  }

  &::-webkit-resizer {
    display: none !important;
  }
`;
