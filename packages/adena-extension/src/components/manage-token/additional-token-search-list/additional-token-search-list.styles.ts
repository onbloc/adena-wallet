import styled from 'styled-components';

export const AdditionalTokenSearchListWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: auto;
  max-height: 240px;

  .scroll-wrapper {
    display: flex;
    flex-direction: column;
    width: 100%;
    overflow-y: auto;
  }
`;

export const AdditionalTokenSearchListItemWrapper = styled.div`
  display: flex;
  flex-direction: row;
  width: 100%;
  height: auto;
  padding: 14px 15px;
  justify-content: space-between;
  transition: 0.2s;
  cursor: pointer;

  &:hover {
    background-color: ${({ theme }) => theme.color.neutral[6]};
  }

  .title {
    color: ${({ theme }) => theme.color.neutral[0]};
    ${({ theme }) => theme.fonts.body2Reg};
  }

  .token-id {
    color: ${({ theme }) => theme.color.neutral[9]};
    ${({ theme }) => theme.fonts.body2Reg}
  }
`;
