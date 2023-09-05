import styled from 'styled-components';

export const ApproveInjectionLoadingWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: auto;
  justify-content: center;
  align-items: center;
  margin-top: 130px;

  .description {
    margin-top: 20px;
    color: ${({ theme }) => theme.color.neutral[0]};
    ${({ theme }) => theme.fonts.body1Bold}
  }
`;
