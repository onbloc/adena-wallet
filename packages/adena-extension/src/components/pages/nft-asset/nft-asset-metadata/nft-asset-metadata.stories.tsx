import { Meta, StoryObj } from '@storybook/react';
import NFTAssetMetadata, { type NFTAssetMetadataProps } from './nft-asset-metadata';

export default {
  title: 'components/nft-asset/NFTAssetMetadata',
  component: NFTAssetMetadata,
} as Meta<typeof NFTAssetMetadata>;

export const Default: StoryObj<NFTAssetMetadataProps> = {
  args: {},
};
