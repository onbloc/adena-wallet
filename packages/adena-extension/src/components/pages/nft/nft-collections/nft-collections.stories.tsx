import { Meta, StoryObj } from '@storybook/react';
import NFTCollections, { type NFTCollectionsProps } from './nft-collections';

export default {
  title: 'components/nft/NFTCollections',
  component: NFTCollections,
} as Meta<typeof NFTCollections>;

export const Default: StoryObj<NFTCollectionsProps> = {
  args: {},
};
