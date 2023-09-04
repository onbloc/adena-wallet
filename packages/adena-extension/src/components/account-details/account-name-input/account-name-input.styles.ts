import styled from 'styled-components';

export const AccountNameInputWrapper = styled.div`
  display: flex;
  flex-direction: row;
  width: 150px;
  height: auto;
  padding: 12.5px 16px;
  background-color: ${({ theme }) => theme.color.neutral[8]};
  border: 1px solid ${({ theme }) => theme.color.neutral[6]};
  border-radius: 18px;
  transition: 0.2s;
  justify-content: center;
  align-items: center;

  &.extended {
    width: 100%;
  }

  input {
    display: flex;
    flex-shrink: 1;
    width: 100%;
    overflow: hidden;
    ${({ theme }) => theme.fonts.body2Reg}

    &:not(:focus) {
      text-overflow: ellipsis;
    }
  }

  .icon-wrapper {
    display: flex;
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    cursor: pointer;

    svg {
      width: 100%;
      height: 100%;

      * {
        transition: 0.2s;
      }
    }

    &:hover {
      svg * {
        fill: ${({ theme }) => theme.color.neutral[0]};
      }
    }
  }
`;
