import mixins from '@styles/mixins';
import { fonts, getTheme } from '@styles/theme';
import styled from 'styled-components';

export const SideMenuWrapper = styled.div`
  ${mixins.flex({ align: 'normal', justify: 'normal' })};
  width: 100%;
  height: 100vh;
  background-color: ${getTheme('neutral', '_8')};

  .header-wrapper {
    ${mixins.flex({ direction: 'row', justify: 'space-between' })};
    height: 50px;
    flex-shrink: 0;
    padding: 0 20px;
    background-color: ${getTheme('neutral', '_9')};

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
          stroke: ${getTheme('neutral', 'a')};
        }
      }

      &:hover {
        svg {
          line {
            stroke: ${getTheme('neutral', '_1')};
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
    border-top: 1px solid ${getTheme('neutral', '_7')};

    .add-account-button {
      display: inline-flex;
      width: fit-content;
      height: fit-content;
      color: ${getTheme('neutral', '_1')};
      transition: 0.2s;
      align-items: center;
      cursor: pointer;

      svg * {
        transition: 0.2s;
        stroke: ${getTheme('neutral', '_1')};
      }

      .text {
        margin-left: 8px;
        ${fonts.body2Bold}
      }

      &:hover {
        color: ${getTheme('neutral', 'a')};
        svg * {
          stroke: ${getTheme('neutral', 'a')};
        }
      }
    }
  }

  .bottom-wrapper {
    ${mixins.flex({ align: 'normal', justify: 'normal' })};
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
