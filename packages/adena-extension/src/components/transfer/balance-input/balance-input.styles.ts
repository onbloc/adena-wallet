import styled from 'styled-components';

export const BalanceInputWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: auto;

  .input-wrapper {
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

    .amount-input {
      width: 100%;
    }

    .denom {
      margin: 0 8px;
    }

    .max-button {
      display: inline-flex;
      flex-shrink: 0;
      width: 64px;
      height: 24px;
      border-radius: 12px;
      background-color: ${({ theme }) => theme.color.neutral[6]};
      align-items: center;
      justify-content: center;
      transition: 0.2s;

      :hover {
        background-color: ${({ theme }) => theme.color.neutral[11]};
      }
    }
  }

  .description {
    position: relative;
    padding: 0 16px;
    ${({ theme }) => theme.fonts.captionReg};
    color: ${({ theme }) => theme.color.neutral[9]};
  }

  &.error {
    .input-wrapper {
      border-color: ${({ theme }) => theme.color.red[2]};
    }

    .description {
      color: ${({ theme }) => theme.color.red[2]};
    }
  }
`;
