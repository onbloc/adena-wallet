import { fonts, getTheme } from '@styles/theme';
import styled from 'styled-components';

export const ApproveAddingNetworkTableWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: auto;
  border-radius: 18px;

  .table-row {
    display: flex;
    flex-direction: column;
    padding: 8px 16px;
    background-color: ${getTheme('neutral', '_9')};
    margin-bottom: 2px;

    &:first-child {
      border-top-right-radius: 18px;
      border-top-left-radius: 18px;
    }

    &:last-child {
      border-bottom-right-radius: 18px;
      border-bottom-left-radius: 18px;
      margin-bottom: 0;
    }

    .title {
      ${fonts.body1Reg};
      color: ${getTheme('neutral', 'a')};
      margin-bottom: 4px;
    }

    .value {
      ${fonts.body1Reg};
      color: ${getTheme('neutral', '_1')};
      word-break: break-all;
    }
  }
`;
