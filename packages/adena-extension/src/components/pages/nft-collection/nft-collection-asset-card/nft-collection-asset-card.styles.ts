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
    height: 20px;
    padding: 0 7px;
    gap: 2px;
    border-radius: 10px;
    background-color: ${getTheme('neutral', '_9')};

    /* min-width:0 lets the name shrink past its text width, so a long
       collection name ellipsizes instead of pushing the row wider. */
    .name-wrapper {
      min-width: 0;
      flex: 0 1 auto;
      ${fonts.captionBold}
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
