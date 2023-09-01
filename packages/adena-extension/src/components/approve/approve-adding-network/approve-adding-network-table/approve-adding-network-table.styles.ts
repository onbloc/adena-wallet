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
    background-color: ${({ theme }) => theme.color.neutral[8]};
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
      ${({ theme }) => theme.fonts.body1Reg};
      color: ${({ theme }) => theme.color.neutral[9]};
      margin-bottom: 4px;
    }

    .value {
      ${({ theme }) => theme.fonts.body1Reg};
      color: ${({ theme }) => theme.color.neutral[0]};
      word-break: break-all;
    }
  }
`;
