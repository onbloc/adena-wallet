import styled from 'styled-components';

export const MainTokenListItemWrapper = styled.div`
  display: flex;
  flex-direction: row;
  padding: 13px;
  width: 100%;
  height: auto;
  background: ${({ theme }) => theme.color.neutral[8]};
  border-radius: 18px;
  align-items: center;
  justify-items: flex-start;
  transition: 0.2s;

  & + & {
    margin-top: 12px;
  }

  &:hover {
    background: ${({ theme }) => theme.color.neutral[6]};
    cursor: pointer;
  }

  .logo-wrapper {
    display: inline-flex;
    flex-shrink: 0;
    width: 34px;
    height: 34px;
    margin-right: 12px;

    .logo {
      width: 100%;
      height: 100%;
      border-radius: 50%;
    }
  }

  .name-wrapper {
    display: inline-flex;
    height: 15px;

    .name {
      ${({ theme }) => theme.fonts.body2Bold};
    }
  }

  .balance-wrapper {
    display: inline-flex;
    width: 100%;
    height: 15px;
    align-items: flex-start;
    justify-content: flex-end;
  }
`;
