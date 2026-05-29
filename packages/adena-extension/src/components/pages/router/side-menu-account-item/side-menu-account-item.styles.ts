import mixins from '@styles/mixins';
import { fonts, getTheme } from '@styles/theme';
import styled from 'styled-components';

export const SideMenuAccountItemWrapper = styled.div`
  ${mixins.flex({ direction: 'row', justify: 'space-between' })};
  width: 100%;
  height: auto;
  padding: 12px 20px;
  transition: 0.2s;
  cursor: pointer;

  &.selected {
    background-color: ${getTheme('neutral', '_7')};
  }

  &:hover {
    background-color: ${getTheme('neutral', '_7')};
  }

  .info-wrapper {
    ${mixins.flex({ align: 'flex-start', justify: 'normal' })};
    flex: 1;
    min-width: 0;

    .address-wrapper {
      display: flex;
      flex-direction: row;
      align-items: center;
      width: 100%;
      min-width: 0;
      overflow: hidden;

      .name {
        ${fonts.body2Bold}
        line-height: 18px;
        min-width: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .address-copy {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        margin: 0 8px 0 6px;
        cursor: pointer;
        flex-shrink: 0;

        .address {
          ${fonts.body3Reg}
          line-height: 18px;
          color: ${getTheme('neutral', 'a')};
          transition: color 0.2s ease;
        }

        .copy-icon {
          display: inline-flex;
          align-items: center;

          svg {
            width: 14px;
            height: 14px;
          }

          svg path {
            transition: stroke 0.2s ease;
            stroke: ${getTheme('neutral', 'a')};
          }
        }

        &:hover .address {
          color: ${getTheme('neutral', '_1')};
        }

        &:hover .copy-icon svg path {
          stroke: ${getTheme('neutral', '_1')};
        }
      }

      .label {
        display: flex;
        height: 16px;
        padding: 3px 10px;
        border-radius: 3px;
        background: #191920;
        justify-content: center;
        align-items: center;
        flex-shrink: 0;
        ${fonts.captionReg}
      }

      .label + .label {
        margin-left: 4px;
      }
    }

    .balance-wrapper {
      display: flex;
      width: 100%;
      height: auto;
      .balance {
        color: ${getTheme('neutral', 'a')};
        ${fonts.body3Reg}
        line-height: 18px;
      }
    }
  }

  .more-wrapper {
    position: relative;
    display: flex;
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    margin-left: 8px;
    cursor: pointer;

    & > svg {
      width: 100%;
      height: 100%;
    }
    & > svg ellipse {
      transition: 0.2s;
      fill: ${getTheme('neutral', '_3')};
    }

    &:hover {
      & > svg ellipse {
        fill: ${getTheme('neutral', '_1')};
      }
    }
  }
`;

export const SideMenuAccountItemMoreInfoWrapper = styled.div<{
  positionX: number;
  positionY: number;
}>`
  position: absolute;
  left: ${({ positionX }): string => `${positionX - 130}px`};
  top: ${({ positionY }): string => `${positionY - 40}px`};
  width: 146px;
  background-color: ${getTheme('neutral', '_8')};
  border: 1px solid ${getTheme('neutral', '_7')};
  border-radius: 12.5px;
  box-shadow: 0px 2px 4px 0px rgba(0, 0, 0, 0.2);
  z-index: 99;
  overflow: hidden;

  .info-wrapper {
    ${mixins.flex({ direction: 'row', align: 'normal', justify: 'normal' })};
    padding: 7px 0 7px 12px;
    border-bottom: 1px solid ${getTheme('neutral', '_7')};
    cursor: pointer;

    &:hover {
      transition: 0.2s;
      background-color: ${getTheme('neutral', '_7')};
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
      ${fonts.body3Reg}
      line-height: 12px;
    }
  }
`;
