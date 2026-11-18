import { Meta, StoryObj } from '@storybook/react-vite';
import NFTCollectionHeader, { type NFTCollectionHeaderProps } from './nft-collection-header';

import { action } from 'storybook/actions';

export default {
  title: 'components/nft/NFTCollectionHeader',
  component: NFTCollectionHeader,
} as Meta<typeof NFTCollectionHeader>;

export const Default: StoryObj<NFTCollectionHeaderProps> = {
  args: {
    title: 'title',
    moveBack: action('moveBack'),
    openGnoscanCollection: action('openGnoscanCollection'),
  },
};
