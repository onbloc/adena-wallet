import AdditionalTokenSearchList, { type AdditionalTokenSearchListProps } from './additional-token-search-list';
import { Meta, StoryObj } from '@storybook/react';

export default {
  title: 'components/manage-token/AdditionalTokenSearchList',
  component: AdditionalTokenSearchList,
} as Meta<typeof AdditionalTokenSearchList>;

const tokenInfos = [
  {
    tokenId: 'token1',
    title: 'Gnoswap (GNOS)',
    description: 'gno.land/gnoswap'
  },
  {
    tokenId: 'token2',
    title: 'Gnoswim (SWIM)',
    description: 'gno.land/gnoswim'
  },
  {
    tokenId: 'token3',
    title: 'Gnosmosi.. (OSMO)',
    description: 'gno.land/gnosmo...'
  },
  {
    tokenId: 'token4',
    title: 'Gnostu.. (GNOSTU..)',
    description: 'gno.land/gnostuck'
  },
];

export const Default: StoryObj<AdditionalTokenSearchListProps> = {
  args: {
    tokenInfos: tokenInfos
  },
};