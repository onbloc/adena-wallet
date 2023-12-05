import styled, { FlattenSimpleInterpolation } from 'styled-components';

export const CustomNetworkInputWrapper = styled.div`
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
      ${({ theme }): FlattenSimpleInterpolation => theme.fonts.body2Reg};
      background-color: ${({ theme }): string => theme.color.neutral[8]};
      border: 1px solid ${({ theme }): string => theme.color.neutral[6]};
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
          color: ${({ theme }): string => theme.color.neutral[9]};
        }
      }
    }
  }

  .error-message {
    position: relative;
    padding: 0 16px;
    ${({ theme }): FlattenSimpleInterpolation => theme.fonts.captionReg};
    height: 14px;
    color: ${({ theme }): string => theme.color.red[2]};
  }
`;
