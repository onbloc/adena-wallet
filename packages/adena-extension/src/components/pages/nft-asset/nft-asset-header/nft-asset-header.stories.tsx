import { Meta, StoryObj } from '@storybook/react';
import NFTAssetHeader, { type NFTAssetHeaderProps } from './nft-asset-header';

import { action } from '@storybook/addon-actions';

export default {
  title: 'components/nft/NFTAssetHeader',
  component: NFTAssetHeader,
} as Meta<typeof NFTAssetHeader>;

export const Default: StoryObj<NFTAssetHeaderProps> = {
  args: {
    title: 'title',
    moveBack: action('moveBack'),
    openGnoscanCollection: action('openGnoscanCollection'),
  },
};
