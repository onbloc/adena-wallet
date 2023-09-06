import styled from 'styled-components';

export const SideMenuLinkWrapper = styled.div`
  display: flex;
  flex-direction: row;
  width: 100%;
  height: auto;
  padding: 16px 20px;
  justify-content: flex-start;
  align-items: center;
  background-color: ${({ theme }) => theme.color.neutral[8]};
  transition: 0.2s;
  cursor: pointer;

  &:hover {
    background-color: ${({ theme }) => theme.color.neutral[6]};
  }

  .icon {
    width: 16px;
    height: 16px;
  }

  .title {
    width: 100%;
    margin-left: 12px;
    ${({ theme }) => theme.fonts.body2Reg}
  }
`;
