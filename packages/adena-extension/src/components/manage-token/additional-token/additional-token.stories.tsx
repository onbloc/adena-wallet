import React from 'react';
import AdditionalToken, { type AdditionalTokenProps } from './additional-token';
import { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';

export default {
  title: 'components/manage-token/AdditionalToken',
  component: AdditionalToken,
} as Meta<typeof AdditionalToken>;

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

export const Default: StoryObj<AdditionalTokenProps> = {
  args: {
    opened: false,
    selected: true,
    keyword: '',
    tokenInfos,
    selectedTokenInfo: {
      title: 'Gnoswap (GNOS)',
      path: 'gno.land/gnos',
      symbol: 'GNOS',
      decimals: '6'
    },
    onChangeKeyword: action('change keyword'),
    onClickOpenButton: action('click open button'),
    onClickListItem: action('click list item'),
    onClickCancel: action('click cancel'),
    onClickAdd: action('click add'),
  },
  render: (args) => <div style={{ height: '500px' }}><AdditionalToken {...args} /></div>,
};