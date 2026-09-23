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

  /*
   * Pinned into a slot inset from both card edges, with the auto margins doing
   * the centring. Centring it by its own width instead — a fixed 132px, or the
   * flex static position — puts the pill outside the card the moment its
   * content is wider than the card, and the card's overflow:hidden then eats
   * the *start* of the label, leaving a name that reads as truncated from the
   * left. Inside this slot the pill simply cannot start before 10px.
   */
  .info-static-wrapper {
    ${mixins.flex({ direction: 'row', align: 'center', justify: 'center' })}
    position: absolute;
    top: 10px;
    left: 10px;
    right: 10px;
    margin: 0 auto;
    width: max-content;
    max-width: calc(100% - 20px);
    flex-shrink: 0;
    height: 20px;
    padding: 0 5px 0 8px;
    gap: 4px;
    flex-shrink: 0;
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

    /* min-width:0 lets the name shrink past its text width, so a long
       collection name ellipsizes instead of pushing the row wider. */
    .name-wrapper {
      min-width: 0;
      flex: 0 1 auto;
      ${fonts.captionBold}
      text-align: center;
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
