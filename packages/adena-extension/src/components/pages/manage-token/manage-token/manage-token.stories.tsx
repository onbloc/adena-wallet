import { action } from '@storybook/addon-actions';
import { Meta, StoryObj } from '@storybook/react';
import ManageTokenSearch, { type ManageTokenSearchProps } from '.';

export default {
  title: 'components/manage-token/ManageTokenSearch',
  component: ManageTokenSearch,
} as Meta<typeof ManageTokenSearch>;

const tokens = [
  {
    tokenId: 'token1',
    symbol: 'GNOT',
    logo: 'https://raw.githubusercontent.com/onbloc/gno-token-resource/main/gno-native/images/gnot.svg',
    name: 'gno.land',
    balanceAmount: {
      value: '240,255.241155',
      denom: 'GNOT',
    },
    main: true,
    activated: true,
  },
  {
    tokenId: 'token2',
    symbol: 'GNOS',
    logo: 'https://avatars.githubusercontent.com/u/118414737?s=200&v=4',
    name: 'Gnoswap',
    balanceAmount: {
      value: '252.844',
      denom: 'GNOS',
    },
    activated: true,
  },
];

export const Default: StoryObj<ManageTokenSearchProps> = {
  args: {
    tokens,
    keyword: '',
    onClickClose: action('click close'),
    onChangeKeyword: action('change keyword'),
    onClickAdded: action('click add button'),
    onToggleActiveItem: action('toggle item'),
  },
};
