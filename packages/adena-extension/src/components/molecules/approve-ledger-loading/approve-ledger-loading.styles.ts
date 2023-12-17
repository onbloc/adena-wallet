import styled, { CSSProp } from 'styled-components';

export const ApproveLedgerLoadingWrapper = styled.div`
  ${({ theme }): CSSProp => theme.mixins.flexbox('column', 'center', 'flex-start')};
  height: calc(100vh - 48px);
  padding: 50px 20px 24px;
  align-self: center;

  .icon {
    margin: 0 auto 20px auto;
  }

  div {
    text-align: center;
  }
`;
