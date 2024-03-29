import mixins from '@styles/mixins';
import styled from 'styled-components';

export const ApproveAddingNetworkWrapper = styled.div`
  ${mixins.flex({ align: 'normal', justify: 'normal' })};
  width: 100%;
  height: auto;
  padding: 24px 20px 120px 20px;
  overflow: auto;

  h4 {
    display: block;
    text-align: right;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
  }

  .logo-wrapper {
    display: flex;
    width: 100%;
    margin: 24px auto;
    justify-content: center;
    align-items: center;

    & img {
      width: 80px;
      height: 80px;
    }
  }

  .table-wrapper {
    display: flex;
    width: 100%;
    margin-top: 15px;
  }
`;
