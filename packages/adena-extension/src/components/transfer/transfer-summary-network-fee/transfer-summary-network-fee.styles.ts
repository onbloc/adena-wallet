import styled from 'styled-components';
import { FlattenSimpleInterpolation } from 'styled-components';

export const TransferSummaryNetworkFeeWrapper = styled.div<{ isError?: boolean }>`
  display: flex;
  flex-direction: row;
  width: 100%;
  padding: 14px 16px;
  background-color: ${({ theme }): string => theme.color.neutral[8]};
  border: 1px solid ${({ theme }): string => theme.color.neutral[6]};
  border-radius: 30px;
  justify-content: space-between;
  align-items: center;
  ${({ isError, theme }): string | false | undefined =>
    isError && `border-color: ${theme.color.red[2]};`}

  .key {
    color: ${({ theme }): string => theme.color.neutral[9]};
    ${({ theme }): FlattenSimpleInterpolation => theme.fonts.body2Reg};
  }
`;
