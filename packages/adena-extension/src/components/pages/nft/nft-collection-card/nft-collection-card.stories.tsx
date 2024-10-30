import { action } from '@storybook/addon-actions';
import { Meta, StoryObj } from '@storybook/react';
import { UseQueryResult } from '@tanstack/react-query';
import NFTCollectionCard, { type NFTCollectionCardProps } from './nft-collection-card';

export default {
  title: 'components/nft/NFTCollectionCard',
  component: NFTCollectionCard,
} as Meta<typeof NFTCollectionCard>;

export const Default: StoryObj<NFTCollectionCardProps> = {
  args: {
    grc721Collection: {
      display: true,
      name: 'Gnopunks',
      networkId: '',
      packagePath: 'package path',
      symbol: '',
      tokenId: '0',
      type: 'grc721',
      isMetadata: true,
      isTokenUri: true,
    },
    pin: action('pin'),
    unpin: action('pin'),
    queryGRC721TokenUri: () =>
      ({
        data: 'https://cdn.prod.website-files.com/6615636a03a6003b067c36dd/661ffd0dbe9673d914edca2d_6423fc9ca8b5e94da1681a70_Screenshot%25202023-03-29%2520at%252010.53.43.jpeg',
        isFetched: true,
      }) as unknown as UseQueryResult<string | null>,
    queryGRC721Balance: () =>
      ({
        data: 3,
      }) as unknown as UseQueryResult<number | null>,
    pinned: false,
  },
};

export const Loading: StoryObj<NFTCollectionCardProps> = {
  args: {
    grc721Collection: {
      display: true,
      name: 'Gnopunks',
      networkId: '',
      packagePath: 'package path',
      symbol: '',
      tokenId: '0',
      type: 'grc721',
      isMetadata: true,
      isTokenUri: true,
    },
    pin: action('pin'),
    unpin: action('pin'),
    queryGRC721TokenUri: () =>
      ({
        data: 'https://cdn.prod.website-files.com/6615636a03a6003b067c36dd/661ffd0dbe9673d914edca2d_6423fc9ca8b5e94da1681a70_Screenshot%25202023-03-29%2520at%252010.53.43.jpeg',
        isFetched: false,
      }) as unknown as UseQueryResult<string | null>,
    queryGRC721Balance: () =>
      ({
        data: 3,
      }) as unknown as UseQueryResult<number | null>,
    pinned: false,
  },
};

export const EmptyImage: StoryObj<NFTCollectionCardProps> = {
  args: {
    grc721Collection: {
      display: true,
      name: 'Gnopunks',
      networkId: '',
      packagePath: 'package path',
      symbol: '',
      tokenId: '0',
      type: 'grc721',
      isMetadata: true,
      isTokenUri: true,
    },
    pin: action('pin'),
    unpin: action('pin'),
    queryGRC721TokenUri: () =>
      ({
        data: null,
        isFetched: true,
      }) as unknown as UseQueryResult<string | null>,
    queryGRC721Balance: () =>
      ({
        data: 3,
      }) as unknown as UseQueryResult<number | null>,
    pinned: false,
  },
};
