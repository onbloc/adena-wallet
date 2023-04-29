import styled from 'styled-components';

export const AdditionalTokenSelectBoxWrapper = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 48px;

  .fixed-wrapper {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: auto;
    min-height: 48px;
    border-radius: 30px;
    border: 1px solid ${({ theme }) => theme.color.neutral[6]};
    background-color: ${({ theme }) => theme.color.neutral[8]};
    overflow: hidden;
    z-index: 2;

    &.opened {
      position: absolute;
      border-radius: 18px;
      margin-bottom: 48px;
    }
  }

  .select-box {
    display: flex;
    width: 100%;
    height: 48px;
    padding: 13px;
    cursor: pointer;
    user-select: none;

    .title {
      width: 100%;
      padding: 0 4px;
      ${({ theme }) => theme.fonts.body2Reg};
      color: ${({ theme }) => theme.color.neutral[9]};
    }

    .icon-wrapper {
      display: inline-flex;
      width: 20px;
      height: 20px;
    }

    &.selected {
      .title {
        color: ${({ theme }) => theme.color.neutral[0]};
      }
    }
  }

  .list-wrapper {
    .search-input-wrapper {
      height: 48px;
      padding: 4px 5px;
      border-top: 1px solid ${({ theme }) => theme.color.neutral[6]};

      & > * {
        background-color: ${({ theme }) => theme.color.neutral[6]};
      }
    }
  }
`;
