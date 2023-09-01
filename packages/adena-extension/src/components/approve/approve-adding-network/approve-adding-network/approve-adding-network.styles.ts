import styled from 'styled-components';

export const ApproveAddingNetworkWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: auto;
  padding: 24px 20px 120px 20px;
  overflow: auto;

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
