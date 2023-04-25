import AdditionalTokenSearchList, { type AdditionalTokenSearchListProps } from './additional-token-search-list';
import { Meta, StoryObj } from '@storybook/react';

export default {
  title: 'components/manage-token/AdditionalTokenSearchList',
  component: AdditionalTokenSearchList,
} as Meta<typeof AdditionalTokenSearchList>;

const tokenInfos = [
  {
    tokenId: 'token1',
    name: 'Gnoswap',
    symbol: 'GNOS',
    chainId: 'test3',
    path: 'gno.land/gnoswap',
    decimals: 6,
  },
  {
    tokenId: 'token2',
    name: 'Gnoswim',
    symbol: 'SWIM',
    chainId: 'test3',
    path: 'gno.land/gnoswim',
    decimals: 6,
  },
  {
    tokenId: 'token3',
    name: 'Gnosmosi',
    symbol: 'OSMO',
    chainId: 'test3',
    path: 'gno.land/gnosmo.',
    decimals: 6,
  },
  {
    tokenId: 'token4',
    name: 'Gnostu..',
    symbol: 'GNOSTU',
    chainId: 'test3',
    path: 'o.land/gnostuck',
    decimals: 6,
  },
];

export const Default: StoryObj<AdditionalTokenSearchListProps> = {
  args: {
    tokenInfos: tokenInfos
  },
};