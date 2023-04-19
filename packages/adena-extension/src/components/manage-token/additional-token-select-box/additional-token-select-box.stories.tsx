import AdditionalTokenSelectBox, { type AdditionalTokenSelectBoxProps } from './additional-token-select-box';
import { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';

export default {
  title: 'components/manage-token/AdditionalTokenSelectBox',
  component: AdditionalTokenSelectBox,
} as Meta<typeof AdditionalTokenSelectBox>;

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

export const Default: StoryObj<AdditionalTokenSelectBoxProps> = {
  args: {
    selected: false,
    selectedTitle: '',
    opened: false,
    tokenInfos,
    keyword: '',
    onChangeKeyword: action('change keyword'),
    onClickListItem: action('click list item'),
    onClickOpenButton: action('click open button')
  },
};

export const SelectedAndClosed: StoryObj<AdditionalTokenSelectBoxProps> = {
  args: {
    selected: true,
    selectedTitle: 'Gnoswap (GNOS)',
    opened: false,
    tokenInfos,
    keyword: '',
    onChangeKeyword: action('change keyword'),
    onClickListItem: action('click list item'),
    onClickOpenButton: action('click open button')
  },
};

export const SelectedAndOpened: StoryObj<AdditionalTokenSelectBoxProps> = {
  args: {
    selected: true,
    selectedTitle: 'Gnoswap (GNOS)',
    opened: true,
    tokenInfos,
    keyword: '',
    onChangeKeyword: action('change keyword'),
    onClickListItem: action('click list item'),
    onClickOpenButton: action('click open button')
  },
};

export const Opened: StoryObj<AdditionalTokenSelectBoxProps> = {
  args: {
    selected: false,
    selectedTitle: '',
    opened: true,
    tokenInfos,
    keyword: '',
    onChangeKeyword: action('change keyword'),
    onClickListItem: action('click list item'),
    onClickOpenButton: action('click open button')
  },
};

export const OpenedAndKeyword: StoryObj<AdditionalTokenSelectBoxProps> = {
  args: {
    selected: false,
    selectedTitle: '',
    opened: true,
    tokenInfos,
    keyword: 'Gno',
    onChangeKeyword: action('change keyword'),
    onClickListItem: action('click list item'),
    onClickOpenButton: action('click open button')
  },
};