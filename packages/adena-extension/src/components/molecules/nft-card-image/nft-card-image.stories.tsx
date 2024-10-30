import { Meta, StoryObj } from '@storybook/react';
import NFTCardImage, { type NFTCardImageProps } from './nft-card-image';

export default {
  title: 'components/common/NFTCardImage',
  component: NFTCardImage,
} as Meta<typeof NFTCardImage>;

export const Default: StoryObj<NFTCardImageProps> = {
  args: {
    image: '',
    isFetched: false,
    hasBadge: false,
  },
};
