import styled from 'styled-components';

export const NFTCollectionsWrapper = styled.div`
  display: grid;
  width: 100%;
  min-height: auto;
  grid-template-columns: 1fr 1fr;
  gap: 16px;

  .description {
    position: absolute;
    top: 210px;
    left: 0px;
    width: 100%;
    text-align: center;
  }
`;
