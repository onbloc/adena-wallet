import { action } from '@storybook/addon-actions';
import { Meta, StoryObj } from '@storybook/react';
import { UseQueryResult } from '@tanstack/react-query';
import NFTCollectionAssetCard, {
  type NFTCollectionAssetCardProps,
} from './nft-collection-asset-card';

export default {
  title: 'components/nft/NFTCollectionAssetCard',
  component: NFTCollectionAssetCard,
} as Meta<typeof NFTCollectionAssetCard>;

export const Default: StoryObj<NFTCollectionAssetCardProps> = {
  args: {
    grc721Token: {
      metadata: null,
      name: 'Gnopunks',
      networkId: '',
      packagePath: 'package path',
      symbol: '',
      tokenId: '0',
      type: 'grc721',
      isMetadata: true,
      isTokenUri: true,
    },
    moveAssetPage: action('moveAssetPage'),
    queryGRC721TokenUri: () =>
      ({
        data: 'https://cdn.prod.website-files.com/6615636a03a6003b067c36dd/661ffd0dbe9673d914edca2d_6423fc9ca8b5e94da1681a70_Screenshot%25202023-03-29%2520at%252010.53.43.jpeg',
        isFetched: true,
      }) as unknown as UseQueryResult<string | null>,
  },
};

export const Loading: StoryObj<NFTCollectionAssetCardProps> = {
  args: {
    grc721Token: {
      metadata: null,
      name: 'Gnopunks',
      networkId: '',
      packagePath: 'package path',
      symbol: '',
      tokenId: '0',
      type: 'grc721',
      isMetadata: true,
      isTokenUri: true,
    },
    moveAssetPage: action('moveAssetPage'),
    queryGRC721TokenUri: () =>
      ({
        data: 'https://cdn.prod.website-files.com/6615636a03a6003b067c36dd/661ffd0dbe9673d914edca2d_6423fc9ca8b5e94da1681a70_Screenshot%25202023-03-29%2520at%252010.53.43.jpeg',
        isFetched: false,
      }) as unknown as UseQueryResult<string | null>,
  },
};

export const EmptyImage: StoryObj<NFTCollectionAssetCardProps> = {
  args: {
    grc721Token: {
      metadata: null,
      name: 'Gnopunks',
      networkId: '',
      packagePath: 'package path',
      symbol: '',
      tokenId: '0',
      type: 'grc721',
      isMetadata: true,
      isTokenUri: true,
    },
    moveAssetPage: action('moveAssetPage'),
    queryGRC721TokenUri: () =>
      ({
        data: null,
        isFetched: true,
      }) as unknown as UseQueryResult<string | null>,
  },
};
