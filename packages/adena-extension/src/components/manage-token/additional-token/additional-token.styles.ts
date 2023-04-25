import styled from 'styled-components';

export const AdditionalTokenWrapper = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 430px;

  .sub-header-container {
    margin-bottom: 30px;
  }

  .select-box-wrapper {
    display: flex;
    margin-bottom: 12px;
  }

  .info-wrapper {
    display: flex;
    height: 100%;
    overflow-y: auto;
  }

  .button-group {
    position: absolute;
    display: flex;
    width: 100%;
    bottom: 0;
    flex-direction: row;
    justify-content: space-between;

    button {
      display: inline-flex;
      width: 100%;
      height: 48px;
      border-radius: 30px;
      align-items: center;
      justify-content: center;
      ${({ theme }) => theme.fonts.body1Bold}

      &:last-child {
        margin-left: 12px;
      }

      &.cancel-button {
        background-color: ${({ theme }) => theme.color.neutral[4]};
      }

      &.add-button {
        background-color: ${({ theme }) => theme.color.primary[3]};

        &.disabled {
          color: ${({ theme }) => theme.color.neutral[4]};
          background-color: ${({ theme }) => theme.color.primary[6]};
        }
      }
    }
  }
`;
