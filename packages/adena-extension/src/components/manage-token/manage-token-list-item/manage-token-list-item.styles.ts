import styled from 'styled-components';

export const ManageTokenListItemWrapper = styled.div`
  display: flex;
  flex-direction: row;
  padding: 10px 14px;
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
    flex-direction: column;
    margin-top: 4px;
    height: 35px;
    justify-content: space-between;

    .name {
      ${({ theme }) => theme.fonts.body2Bold};
      line-height: 15px;
    }
  }

  .toggle-wrapper {
    display: inline-flex;
    width: 100%;
    height: auto;
    align-items: flex-start;
    justify-content: flex-end;
  }
`;
