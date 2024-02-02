import styled from 'styled-components';

import check from '@assets/check-circle.svg';
import mixins from '@styles/mixins';
import { fonts, getTheme } from '@styles/theme';

export const WalletConnectWrapper = styled.div`
  ${mixins.flex({ justify: 'flex-start' })};
  width: 100vw;
  padding: 0 20px;
  align-self: center;

  .main-title {
    max-width: 320px;
    text-overflow: ellipsis;
    margin-top: 24px;
    overflow: hidden;
    white-space: nowrap;
    width: 100%;
    text-align: center;
  }

  .logo-wrapper {
    margin: 24px auto;
    width: 100%;
    height: auto;
    text-align: center;

    img {
      width: 80px;
      height: 80px;
    }
  }

  .domain-wrapper {
    ${mixins.flex({ direction: 'row' })};
    width: 100%;
    min-height: 41px;
    border-radius: 24px;
    padding: 10px 18px;
    margin-bottom: 12px;
    background-color: ${getTheme('neutral', '_9')};
    ${fonts.body2Reg};
  }

  .info-table {
    width: 100%;
    height: auto;
    border-radius: 18px;
    background-color: ${getTheme('neutral', '_9')};

    .info-table-header {
      ${mixins.flex({ align: 'flex-start' })};
      width: 100%;
      padding: 12px;
      color: ${getTheme('neutral', 'a')};
      ${fonts.body2Bold};
      border-bottom: 2px solid ${getTheme('neutral', '_8')};
    }

    .info-table-body {
      ${mixins.flex({ align: 'flex-start' })};
      width: 100%;
      padding: 12px;
      gap: 8px;
      ${fonts.body2Reg};

      .row {
        position: relative;
        padding-left: 24px;
        :before {
          content: '';
          width: 16px;
          height: 16px;
          background-image: url(${check});
          ${mixins.posTopCenterLeft()}
        }
      }
    }
  }

  .description-wrapper {
    ${mixins.flex({ align: 'flex-start' })};
    padding: 4px 0;
    margin-bottom: 43px;
    color: ${getTheme('neutral', 'a')};
    ${fonts.captionReg};
  }
`;
