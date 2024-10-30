import { Meta, StoryObj } from '@storybook/react';
import NFTCollectionAssets, { type NFTCollectionAssetsProps } from './nft-collection-assets';

export default {
  title: 'components/nft/NFTCollectionAssets',
  component: NFTCollectionAssets,
} as Meta<typeof NFTCollectionAssets>;

export const Default: StoryObj<NFTCollectionAssetsProps> = {
  args: {},
};
