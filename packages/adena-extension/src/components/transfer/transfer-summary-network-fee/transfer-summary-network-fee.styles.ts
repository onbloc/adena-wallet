import styled from 'styled-components';

export const TransferSummaryNetworkFeeWrapper = styled.div`
  display: flex;
  flex-direction: row;
  width: 100%;
  padding: 14px 16px;
  background-color: ${({ theme }) => theme.color.neutral[8]};
  border: 1px solid ${({ theme }) => theme.color.neutral[6]};
  border-radius: 30px;
  justify-content: space-between;
  align-items: center;

  .key {
    color: ${({ theme }) => theme.color.neutral[9]};
    ${({ theme }) => theme.fonts.body2Reg};
  }
`;
