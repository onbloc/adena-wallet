import styled, { FlattenSimpleInterpolation } from 'styled-components';

export const SideMenuWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  background-color: ${({ theme }): string => theme.color.neutral[7]};

  .header-wrapper {
    display: flex;
    height: 50px;
    flex-shrink: 0;
    padding: 0 20px;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    background-color: ${({ theme }): string => theme.color.neutral[8]};

    .logo {
      width: 82px;
      height: 17px;
    }

    .close-button {
      display: inline-flex;
      width: 14px;
      height: 14px;

      svg {
        width: 100%;
        height: 100%;

        line {
          transition: 0.2s;
          stroke: ${({ theme }): string => theme.color.neutral[9]};
        }
      }

      &:hover {
        svg {
          line {
            stroke: ${({ theme }): string => theme.color.neutral[0]};
          }
        }
      }
    }
  }

  .content-wrapper {
    display: flex;
    flex-shrink: 0;
    height: auto;
    max-height: 240px;
    overflow: auto;
  }

  .content-sub-wrapper {
    display: flex;
    height: 100%;
    padding: 16px 20px;
    border-top: 1px solid ${({ theme }): string => theme.color.neutral[6]};

    .add-account-button {
      display: inline-flex;
      width: fit-content;
      height: fit-content;
      color: ${({ theme }): string => theme.color.neutral[0]};
      transition: 0.2s;
      align-items: center;
      cursor: pointer;

      svg * {
        transition: 0.2s;
        stroke: ${({ theme }): string => theme.color.neutral[0]};
      }

      .text {
        margin-left: 8px;
        ${({ theme }): FlattenSimpleInterpolation => theme.fonts.body2Bold}
      }

      &:hover {
        color: ${({ theme }): string => theme.color.neutral[9]};
        svg * {
          stroke: ${({ theme }): string => theme.color.neutral[9]};
        }
      }
    }
  }

  .bottom-wrapper {
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    height: fit-content;

    & > div {
      margin-bottom: 1px;
    }

    & > div:last-child {
      margin-bottom: 0;
    }
  }
`;
