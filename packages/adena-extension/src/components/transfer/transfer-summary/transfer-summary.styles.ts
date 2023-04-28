import styled from 'styled-components';

export const TransferSummaryWrapper = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 450px;
  align-items: center;
  justify-content: flex-start;

  .sub-header-wrapper {
    width: 100%;
  }

  .info-wrapper {
    width: 100%;
    margin-top: 25px;
  }

  .direction-icon-wrapper {
    width: 100%;
    text-align: center;
    margin: 10px 0;
  }

  .network-fee-wrapper {
    width: 100%;
    height: 100%;
    margin-top: 20px;
  }

  .button-group {
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

      &.send {
        background-color: ${({ theme }) => theme.color.primary[3]};

        :hover {
          background-color: ${({ theme }) => theme.color.primary[4]};
        }
      }
    }
  }
`;
