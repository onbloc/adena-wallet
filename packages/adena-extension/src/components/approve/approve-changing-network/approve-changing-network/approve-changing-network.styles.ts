import styled from 'styled-components';

export const ApproveChangingNetworkWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: auto;
  justify-content: center;
  align-items: center;
  padding: 24px 20px;

  h4 {
    display: -webkit-box;
    max-width: 100%;
    text-overflow: ellipsis;
    overflow: hidden;
    word-break: break-all;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .description-wrapper {
    display: flex;
    width: 100%;
    margin: 12px auto 50px auto;
    justify-content: center;
  }

  .info-wrapper {
    display: flex;
    flex-direction: row;
    width: fit-content;
    align-items: flex-start;

    .icon-arrow {
      width: 24px;
      height: 24px;
      margin: 28px;
    }
  }
`;
