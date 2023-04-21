import styled from 'styled-components';

export const TransactionHistoryListWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: auto;

  & > .title {
    ${({ theme }) => theme.fonts.body1Reg};
    color: ${({ theme }) => theme.color.neutral[9]};
  }

  & > .list-wrapper {
    margin-top: 12px;
  }
`;
