import React from 'react';
import AdditionalToken from '.';
import { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { AdditionalTokenProps } from '@types';

export default {
  title: 'components/manage-token/AdditionalToken',
  component: AdditionalToken,
} as Meta<typeof AdditionalToken>;

const tokenInfos = [
  {
    tokenId: 'token1',
    name: 'GnoSwap',
    symbol: 'GNOS',
    chainId: 'test3',
    path: 'gno.land/gnoswap',
    pathInfo: 'gnoswap',
    decimals: 6,
  },
  {
    tokenId: 'token2',
    name: 'Gnoswim',
    symbol: 'SWIM',
    chainId: 'test3',
    path: 'gno.land/gnoswim',
    pathInfo: 'gnoswim',
    decimals: 6,
  },
  {
    tokenId: 'token3',
    name: 'Gnosmosi',
    symbol: 'OSMO',
    chainId: 'test3',
    path: 'gno.land/gnosmo.',
    pathInfo: 'gnosmo.',
    decimals: 6,
  },
  {
    tokenId: 'token4',
    name: 'Gnostu..',
    symbol: 'GNOSTU',
    chainId: 'test3',
    path: 'o.land/gnostuck',
    pathInfo: 'gnostuck',
    decimals: 6,
  },
];

export const Default: StoryObj<AdditionalTokenProps> = {
  args: {
    opened: false,
    selected: true,
    keyword: '',
    tokenInfos,
    selectedTokenInfo: {
      tokenId: 'token1',
      name: 'GnoSwap',
      symbol: 'GNOS',
      chainId: 'test3',
      path: 'gno.land/gnoswap',
      pathInfo: 'gnoswap',
      decimals: 6,
    },
    onChangeKeyword: action('change keyword'),
    onClickOpenButton: action('click open button'),
    onClickListItem: action('click list item'),
    onClickBack: action('click back'),
    onClickCancel: action('click cancel'),
    onClickAdd: action('click add'),
  },
  render: (args) => (
    <div style={{ height: '500px' }}>
      <AdditionalToken {...args} />
    </div>
  ),
};
