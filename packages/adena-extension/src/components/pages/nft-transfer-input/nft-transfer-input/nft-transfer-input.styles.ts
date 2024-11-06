import mixins from '@styles/mixins';
import styled from 'styled-components';

export const NFTTransferInputWrapper = styled.div`
  ${mixins.flex({ align: 'normal', justify: 'normal' })};
  position: relative;
  width: 100%;
  width: 100%;
  height: auto;
  padding: 24px 20px 96px;

  .asset-card-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 25px auto 30px;
    width: 100px;
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
`;
