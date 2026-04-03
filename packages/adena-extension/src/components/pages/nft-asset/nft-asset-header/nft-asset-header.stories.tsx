import { Meta, StoryObj } from '@storybook/react-vite';
import NFTAssetHeader, { type NFTAssetHeaderProps } from './nft-asset-header';

import { action } from 'storybook/actions';

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
