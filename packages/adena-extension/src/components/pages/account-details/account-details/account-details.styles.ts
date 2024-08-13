import mixins from '@styles/mixins';
import { fonts, getTheme } from '@styles/theme';
import styled from 'styled-components';

export const AccountDetailsWrapper = styled.div`
  ${mixins.flex({ align: 'normal', justify: 'normal' })};
  width: 100%;
  height: auto;
  padding: 24px 20px;

  .name-input-wrapper {
    ${mixins.flex()};
    width: 100%;
  }

  .qrcode-wrapper {
    ${mixins.flex()};
    width: 100%;
    padding: 12px 0;

    .qrcode-background {
      display: flex;
      background-color: #fff;
      padding: 10px;
      border-radius: 8px;
    }

    .qrcode-address-wrapper , .qrcode-gno-name-wrapper {
      ${mixins.flex({ direction: 'row', justify: 'space-between' })};
      width: 100%;
      height: 42px;
      background-color: ${getTheme('neutral', '_9')};
      margin-top: 12px;
      padding: 12px 18px 12px 16px;
      border-radius: 18px;

      .address, .gno-name {
        display: block;
        width: 100%;
        margin-right: 8px;
        ${fonts.light1Reg}
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }
  }
`;
