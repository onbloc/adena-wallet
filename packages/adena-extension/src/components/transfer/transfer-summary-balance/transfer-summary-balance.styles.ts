import styled from 'styled-components';

export const TransferSummaryBalanceWrapper = styled.div`
  display: flex;
  flex-direction: row;
  width: 100%;
  height: auto;
  padding: 20px;
  background-color: ${({ theme }) => theme.color.neutral[8]};
  border-radius: 18px;
  justify-content: space-between;
  align-items: center;

  .token-image {
    width: 30px;
    height: 30px;
  }

  .balance {
    display: contents;
    ${({ theme }) => theme.fonts.header5};
  }
`;
