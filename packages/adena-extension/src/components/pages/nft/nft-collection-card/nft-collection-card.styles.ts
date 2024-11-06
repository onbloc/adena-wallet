import { SkeletonBoxStyle, View } from '@components/atoms';
import mixins from '@styles/mixins';
import { fonts, getTheme } from '@styles/theme';
import styled from 'styled-components';

export const NFTCollectionCardWrapper = styled(View)`
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  height: auto;
  overflow: hidden;
  border-radius: 8px;
  cursor: pointer;

  .info-static-wrapper {
    ${mixins.flex({ direction: 'row', align: 'center', justify: 'space-between' })}
    position: absolute;
    top: 10px;
    width: 132px;
    flex-shrink: 0;
    height: 20px;
    padding: 0 5px 0 8px;
    gap: 4px;
    flex-shrink: 0;
    align-self: center;
    border-radius: 10px;
    background-color: ${getTheme('neutral', '_9')};
    cursor: default;

    .pin-wrapper {
      ${mixins.flex({ direction: 'column', align: 'center', justify: 'center' })}
      width: 10px;
      height: 10px;
      cursor: pointer;

      .icon-pin {
        path {
          transition: 0.2s;
          fill: ${getTheme('neutral', '_5')};
        }

        &:hover,
        &.pinned.pinned {
          path {
            fill: ${getTheme('neutral', '_1')};
          }
        }
      }
    }

    .name-wrapper {
      display: inline-block;
      width: 100%;
      ${fonts.captionBold}
      text-align: center;
      word-break: break-all;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    .balance-wrapper {
      ${mixins.flex({ direction: 'column', align: 'flex-end', justify: 'flex-end' })}
      width: auto;
      flex-shrink: 0;
      color: ${getTheme('neutral', 'a')};
      ${fonts.light1Bold};
    }
  }
`;

export const NFTCollectionCardImageWrapper = styled(View)`
  width: 100%;
  height: 100%;
  background-color: ${getTheme('neutral', '_7')};
  align-items: center;
  justify-content: center;

  .empty-image {
    width: 31px;
    height: auto;
  }

  .nft-image {
    width: auto;
    height: auto;
    min-width: 100%;
    min-height: 100%;
    object-fit: cover;
  }
`;

export const NFTCollectionCardImageSkeletonBox = styled(SkeletonBoxStyle)`
  ${mixins.flex({ align: 'flex-end', justify: 'space-between' })}
  width: 100%;
  flex: 1;
  height: 100%;
  padding: 10px;
`;
