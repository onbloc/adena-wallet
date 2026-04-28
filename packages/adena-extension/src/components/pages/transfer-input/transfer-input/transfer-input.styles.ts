import mixins from '@styles/mixins';
import { fonts, getTheme } from '@styles/theme';
import styled from 'styled-components';

export const TransferInputWrapper = styled.div`
  ${mixins.flex({ align: 'normal', justify: 'normal' })};
  position: relative;
  width: 100%;
  width: 100%;
  height: auto;
  padding: 24px 20px 96px;

  .logo-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    padding-top: 5px;
    margin: 30px 0;
    .logo {
      width: 100px;
      height: 100px;
    }
  }

  .mode-tabs-wrapper {
    display: flex;
    margin-bottom: 16px;
  }

  .receiving-chain-wrapper {
    display: flex;
    margin-bottom: 12px;
  }

  .address-input-wrapper {
    display: flex;
    margin-bottom: 12px;
  }

  .balance-input-wrapper {
    display: flex;
    margin-bottom: 12px;
  }

  .memo-input-wrapper {
    display: flex;
    padding-bottom: 20px;
  }

  .bridge-guide-link {
    ${mixins.flex({ direction: 'row', align: 'center', justify: 'center' })};
    gap: 6px;
    align-self: center;
    padding: 8px 12px;
    background: transparent;
    border: none;
    cursor: pointer;
    ${fonts.body2Reg};
    color: ${getTheme('neutral', 'a')};

    &:hover .label {
      color: ${getTheme('neutral', '_1')};
    }
  }
`;
