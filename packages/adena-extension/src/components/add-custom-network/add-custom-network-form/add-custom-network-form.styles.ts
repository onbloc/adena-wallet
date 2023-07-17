import styled from 'styled-components';

export const AddCustomNetworkFormWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;

  .input-wrapper {
    display: flex;
    flex-direction: column;
    width: 100%;

    .input-box {
      display: flex;
      flex-direction: row;
      width: 100%;
      min-height: 48px;
      padding: 12px 16px;
      ${({ theme }) => theme.fonts.body2Reg};
      background-color: ${({ theme }) => theme.color.neutral[8]};
      border: 1px solid ${({ theme }) => theme.color.neutral[6]};
      border-radius: 30px;
      align-items: center;
      margin-top: 12px;

      :first-child {
        margin-top: 0;
      }

      input {
        display: flex;
        width: 100%;
        height: auto;
        resize: none;
        overflow: hidden;
        line-height: 25px;

        ::placeholder {
          color: ${({ theme }) => theme.color.neutral[9]};
        }
      }
    }
  }

  .error-message {
    position: relative;
    padding: 0 16px;
    ${({ theme }) => theme.fonts.captionReg};
    color: ${({ theme }) => theme.color.red[2]};
  }

  .submit-wrapper {
    position: absolute;
    display: flex;
    width: 100%;
    bottom: 0;
    justify-content: space-between;

    button {
      width: 100%;
      height: 48px;
      border-radius: 30px;
      ${({ theme }) => theme.fonts.body1Bold};
      background-color: ${({ theme }) => theme.color.neutral[4]};
      transition: 0.2s;

      :hover {
        background-color: ${({ theme }) => theme.color.neutral[5]};
      }

      &:last-child {
        margin-left: 10px;
      }

      &.save {
        background-color: ${({ theme }) => theme.color.primary[3]};

        :hover {
          background-color: ${({ theme }) => theme.color.primary[4]};
        }

        &.disabled {
          color: ${({ theme }) => theme.color.neutral[4]};
          background-color: ${({ theme }) => theme.color.primary[6]};
          cursor: default;
        }
      }
    }
  }
`;
