import { View } from '@components/atoms';
import mixins from '@styles/mixins';
import { fonts, getTheme } from '@styles/theme';
import styled from 'styled-components';

export const NFTCollectionAssetCardWrapper = styled(View)`
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  height: auto;
  overflow: hidden;
  border-radius: 8px;
  cursor: pointer;

  .info-static-wrapper {
    ${mixins.flex({ direction: 'row', align: 'center', justify: 'center' })}
    position: absolute;
    top: 10px;
    width: 132px;
    flex-shrink: 0;
    height: 20px;
    padding: 0 7px;
    gap: 2px;
    flex-shrink: 0;
    align-self: center;
    border-radius: 10px;
    background-color: ${getTheme('neutral', '_9')};

    .name-wrapper {
      display: inline-block;
      width: auto;
      ${fonts.captionBold}
      word-break: break-all;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    .id-wrapper {
      ${mixins.flex({ direction: 'column', align: 'flex-end', justify: 'flex-end' })}
      width: auto;
      flex-shrink: 0;
      ${fonts.captionBold}
    }
  }
`;
