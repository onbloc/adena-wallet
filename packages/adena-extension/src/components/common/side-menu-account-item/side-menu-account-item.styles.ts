import styled from 'styled-components';

export const SideMenuAccountItemWrapper = styled.div`
  display: flex;
  flex-direction: row;
  width: 100%;
  height: auto;
  padding: 12px 20px;
  justify-content: space-between;
  align-items: center;
  transition: 0.2s;
  cursor: pointer;

  &.selected {
    background-color: ${({ theme }) => theme.color.neutral[6]};
  }

  &:hover {
    background-color: ${({ theme }) => theme.color.neutral[6]};
  }

  .info-wrapper {
    display: flex;
    flex-direction: column;
    align-items: flex-start;

    .address-wrapper {
      display: inline-flex;
      flex-direction: row;

      .name {
        ${({ theme }) => theme.fonts.body2Bold}
        line-height: 18px;
      }

      .copy-button {
        margin: 0 8px 0 5px;
      }

      .label {
        display: flex;
        height: 16px;
        padding: 3px 10px;
        border-radius: 3px;
        background: #191920;
        justify-content: center;
        align-items: center;
        ${({ theme }) => theme.fonts.captionReg}
      }
    }

    .balance-wrapper {
      display: flex;
      width: 100%;
      height: auto;
      .balance {
        color: ${({ theme }) => theme.color.neutral[9]};
        ${({ theme }) => theme.fonts.body3Reg}
        line-height: 18px;
      }
    }
  }

  .more-wrapper {
    position: relative;
    display: flex;
    width: 16px;
    height: 16px;
    cursor: pointer;

    & > svg {
      width: 100%;
      height: 100%;
    }
    & > svg ellipse {
      transition: 0.2s;
      fill: ${({ theme }) => theme.color.neutral[2]};
    }

    &:hover {
      & > svg ellipse {
        fill: ${({ theme }) => theme.color.neutral[0]};
      }
    }
  }
`;

export const SideMenuAccountItemMoreInfoWrapper = styled.div<{
  positionX: number;
  positionY: number;
}>`
  position: absolute;
  left: ${({ positionX }) => `${positionX - 130}px`};
  top: ${({ positionY }) => `${positionY - 40}px`};
  width: 146px;
  background-color: ${({ theme }) => theme.color.neutral[7]};
  border: 1px solid ${({ theme }) => theme.color.neutral[6]};
  border-radius: 12.5px;
  box-shadow: 0px 2px 4px 0px rgba(0, 0, 0, 0.2);
  z-index: 99;
  overflow: hidden;

  .info-wrapper {
    display: flex;
    flex-direction: row;
    padding: 7px 0 7px 12px;
    border-bottom: 1px solid ${({ theme }) => theme.color.neutral[6]};
    cursor: pointer;

    &:hover {
      transition: 0.2s;
      background-color: ${({ theme }) => theme.color.neutral[6]};
    }

    &:last-child {
      border-bottom: 0;
    }

    svg {
      width: 14px;
      height: 14px;
    }

    .title {
      width: 100%;
      margin-left: 8px;
      ${({ theme }) => theme.fonts.body3Reg}
      line-height: 12px;
    }
  }
`;
