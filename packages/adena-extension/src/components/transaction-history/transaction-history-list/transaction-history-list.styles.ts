import styled, { FlattenSimpleInterpolation } from 'styled-components';

export const TransactionHistoryListWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: auto;

  & > .title {
    ${({ theme }): FlattenSimpleInterpolation => theme.fonts.body1Reg};
    color: ${({ theme }): string => theme.color.neutral[9]};
  }

  & > .list-wrapper {
    margin-top: 12px;
  }
`;
