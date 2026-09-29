import { SkeletonBoxStyle, View } from '@components/atoms';
import mixins from '@styles/mixins';
import { getTheme } from '@styles/theme';
import styled from 'styled-components';

export const NFTCardImageWrapper = styled(View)`
  width: 100%;
  height: 100%;
  background-color: ${getTheme('neutral', '_7')};
  align-items: center;
  justify-content: center;

  .empty-image {
    width: 31px;
    height: auto;
  }

  /* An auto-sized replaced element keeps its intrinsic size, so a token image
     larger than the card (e.g. the 135px GNFT SVG in a 100px transfer
     thumbnail) overflowed and was cropped by the wrapper. Pin it to the card
     and let object-fit do the scaling. */
  .nft-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

export const NFTCardImageSkeletonBox = styled(SkeletonBoxStyle)`
  ${mixins.flex({ align: 'flex-end', justify: 'space-between' })}
  width: 100%;
  flex: 1;
  height: 100%;
  padding: 10px;
`;
