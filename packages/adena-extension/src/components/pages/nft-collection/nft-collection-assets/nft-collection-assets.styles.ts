import { getTheme } from '@styles/theme';
import styled from 'styled-components';

export const NFTCollectionAssetsWrapper = styled.div`
  position: relative;
  display: grid;
  width: 100%;
  min-height: auto;
  grid-template-columns: 1fr 1fr;
  gap: 16px;

  .description {
    position: absolute;
    top: 139px;
    left: 0px;
    width: 100%;
    text-align: center;
  }

  .loading-wrapper {
    position: absolute;
    width: 100%;
    height: auto;
    top: 0;
    left: 0;
    background-color: ${getTheme('neutral', '_8')};
  }
`;
