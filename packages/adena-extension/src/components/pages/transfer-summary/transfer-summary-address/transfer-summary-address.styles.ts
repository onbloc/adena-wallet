import { fonts, getTheme } from '@styles/theme';
import styled from 'styled-components';

export const TransferSummaryAddressWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  width: 100%;
  height: auto;
  padding: 20px;
  gap: 12px;
  ${fonts.body2Reg};
  background-color: ${getTheme('neutral', '_9')};
  border-radius: 18px;

  .address-wrapper {
    display: flex;
    width: 100%;
    height: auto;
    word-break: break-all;
    overflow: hidden;
  }

  .memo-wrapper {
    display: block;
    width: 100%;
    height: auto;
    color: ${getTheme('neutral', 'a')};
    word-break: break-all;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
`;
