import styled from 'styled-components';

export const TransactionHistoryListItemWrapper = styled.div`
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 60px;
  padding: 12px 14px;
  align-items: center;
  background-color: ${({ theme }) => theme.color.neutral[6]};
  border-radius: 18px;
  cursor: pointer;
  transition: 0.2s;

  :hover {
    background-color: ${({ theme }) => theme.color.neutral[11]};
  }

  & + & {
    margin-top: 12px;
  }

  .logo-wrapper {
    position: relative;
    display: flex;
    flex-shrink: 0;
    width: 34px;
    height: 34px;

    .logo {
      width: 100%;
      height: 100%;
    }

    .badge {
      position: absolute;
      width: 12px;
      height: 12px;
      right: 0;
      bottom: 0;
    }
  }

  .title-wrapper {
    display: flex;
    width: 100%;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    margin: 0 12px;

    .title {
      display: inline-flex;
      align-items: center;
      ${({ theme }) => theme.fonts.body3Bold};
      line-height: 18px;

      &.extend {
        ${({ theme }) => theme.fonts.body2Bold};
      }

      .extra-info {
        ${({ theme }) => theme.fonts.body4Bold};
        margin-left: 5px;
      }
    }

    .description {
      ${({ theme }) => theme.fonts.body3Reg};
      color: ${({ theme }) => theme.color.neutral[9]};
      line-height: 18px;
    }
  }

  .value-wrapper {
    display: flex;
    flex-wrap: wrap;
    width: fit-content;
    max-width: 150px;
    flex-shrink: 0;
    flex-direction: column;
    justify-content: center;
    align-items: flex-end;
    word-break: break-all;

    .value.more {
      ${({ theme }) => theme.fonts.body2Reg};
    }

    &.active div * {
      color: ${({ theme }) => theme.color.green[2]};
    }

    &.blur div * {
      color: ${({ theme }) => theme.color.neutral[9]};
    }
  }
`;