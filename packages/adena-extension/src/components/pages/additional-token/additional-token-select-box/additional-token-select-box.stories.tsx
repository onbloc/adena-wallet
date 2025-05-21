import AdditionalTokenSelectBox from './additional-token-select-box';
import { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { AdditionalTokenSelectBoxProps } from '@types';

export default {
  title: 'components/manage-token/AdditionalTokenSelectBox',
  component: AdditionalTokenSelectBox,
} as Meta<typeof AdditionalTokenSelectBox>;

const tokenInfos = [
  {
    tokenId: 'token1',
    name: 'GnoSwap',
    symbol: 'GNS',
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
    path: 'gno.land/gnosmo...',
    pathInfo: 'gnosmo...',
    decimals: 6,
  },
  {
    tokenId: 'token4',
    name: 'Gnostu',
    symbol: 'GNOSTU',
    chainId: 'test3',
    path: 'gno.land/gnostuck',
    pathInfo: 'gnostuck',
    decimals: 6,
  },
];

export const Default: StoryObj<AdditionalTokenSelectBoxProps> = {
  args: {
    selected: false,
    selectedInfo: {
      name: 'GnoSwap',
      symbol: 'GNS',
    },
    opened: false,
    tokenInfos,
    keyword: '',
    onChangeKeyword: action('change keyword'),
    onClickListItem: action('click list item'),
    onClickOpenButton: action('click open button'),
  },
};

export const SelectedAndClosed: StoryObj<AdditionalTokenSelectBoxProps> = {
  args: {
    selected: true,
    selectedInfo: {
      name: 'GnoSwap',
      symbol: 'GNS',
    },
    opened: false,
    tokenInfos,
    keyword: '',
    onChangeKeyword: action('change keyword'),
    onClickListItem: action('click list item'),
    onClickOpenButton: action('click open button'),
  },
};

export const SelectedAndOpened: StoryObj<AdditionalTokenSelectBoxProps> = {
  args: {
    selected: true,
    selectedInfo: {
      name: 'GnoSwap',
      symbol: 'GNS',
    },
    opened: true,
    tokenInfos,
    keyword: '',
    onChangeKeyword: action('change keyword'),
    onClickListItem: action('click list item'),
    onClickOpenButton: action('click open button'),
  },
};

export const Opened: StoryObj<AdditionalTokenSelectBoxProps> = {
  args: {
    selected: false,
    selectedInfo: {
      name: 'GnoSwap',
      symbol: 'GNS',
    },
    opened: true,
    tokenInfos,
    keyword: '',
    onChangeKeyword: action('change keyword'),
    onClickListItem: action('click list item'),
    onClickOpenButton: action('click open button'),
  },
};

export const OpenedAndKeyword: StoryObj<AdditionalTokenSelectBoxProps> = {
  args: {
    selected: false,
    selectedInfo: {
      name: 'GnoSwap',
      symbol: 'GNS',
    },
    opened: true,
    tokenInfos,
    keyword: 'Gno',
    onChangeKeyword: action('change keyword'),
    onClickListItem: action('click list item'),
    onClickOpenButton: action('click open button'),
  },
};
