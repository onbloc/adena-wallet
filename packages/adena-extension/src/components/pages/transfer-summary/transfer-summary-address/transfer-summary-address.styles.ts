import { fonts, getTheme } from '@styles/theme';
import styled from 'styled-components';

export const TransferSummaryAddressWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  width: 100%;
  height: auto;
  padding: 20px;
  ${fonts.body2Reg};
  background-color: ${getTheme('neutral', '_9')};
  border-radius: 18px;
  justify-content: space-between;
  align-items: center;
  word-break: break-all;
`;
