import { Meta, StoryObj } from '@storybook/react';
import NFTAssetImageCard, { type NFTAssetImageCardProps } from './nft-asset-image-card';

export default {
  title: 'components/nft-asset/NFTAssetImageCard',
  component: NFTAssetImageCard,
} as Meta<typeof NFTAssetImageCard>;

export const Default: StoryObj<NFTAssetImageCardProps> = {
  args: {},
};
