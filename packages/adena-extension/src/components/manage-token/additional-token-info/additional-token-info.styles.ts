import styled from 'styled-components';

export const AdditionalTokenInfoWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: auto;
`;

export const AdditionalTokenInfoItemWrapper = styled.div`
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 48px;
  padding: 13px 16px;
  background-color: ${({ theme }) => theme.color.neutral[8]};
  border-radius: 30px;
  align-items: center;
  justify-content: space-between;

  & + & {
    margin-top: 12px;
  }

  .title {
    color: ${({ theme }) => theme.color.neutral[9]};
    ${({ theme }) => theme.fonts.body2Reg};
  }

  .value {
    color: ${({ theme }) => theme.color.neutral[0]};
    ${({ theme }) => theme.fonts.body2Reg};
  }
`;
