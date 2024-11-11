import React, { useState } from 'react';

import IconEmptyImage from '@assets/icon-empty-image.svg';
import { Loading } from '@components/atoms';
import { NFTCardImageSkeletonBox, NFTCardImageWrapper } from './nft-card-image.styles';

export interface NFTCardImageProps {
  isFetched: boolean;
  image: string | null | undefined;
  hasBadge?: boolean;
}

const NFTCardImage: React.FC<NFTCardImageProps> = ({ isFetched, image, hasBadge = false }) => {
  const [hasError, setHasError] = useState(false);

  const handleError = (): void => {
    setHasError(true);
  };

  if (!isFetched) {
    return (
      <NFTCardImageSkeletonBox>
        {hasBadge && <Loading.Round width='132px' height='20px' radius='10px' margin='0 auto' />}
      </NFTCardImageSkeletonBox>
    );
  }

  if (!image || hasError) {
    return (
      <NFTCardImageWrapper className='empty'>
        <img className='empty-image' src={IconEmptyImage} alt='empty image' />
      </NFTCardImageWrapper>
    );
  }

  return (
    <NFTCardImageWrapper>
      <img className='nft-image' src={image} onError={handleError} alt='nft image' />
    </NFTCardImageWrapper>
  );
};

export default NFTCardImage;
