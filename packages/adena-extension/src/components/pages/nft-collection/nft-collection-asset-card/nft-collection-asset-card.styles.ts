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

  /* Sized by its content rather than pinned to 132px: at the 2-column grid's
     card width that fixed pill already ran edge to edge, and any narrower card
     made it overflow and clip the label at both ends. */
  .info-static-wrapper {
    ${mixins.flex({ direction: 'row', align: 'center', justify: 'center' })}
    position: absolute;
    top: 10px;
    width: auto;
    max-width: calc(100% - 20px);
    flex-shrink: 0;
    height: 20px;
    padding: 0 7px;
    gap: 2px;
    flex-shrink: 0;
    align-self: center;
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
