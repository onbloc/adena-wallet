import ManageTokenListItem, { type ManageTokenListItemProps } from './manage-token-list-item';
import { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';

export default {
  title: 'components/manage-token/ManageTokenListItem',
  component: ManageTokenListItem,
} as Meta<typeof ManageTokenListItem>;

const token = {
  tokenId: 'token1',
  logo: 'https://raw.githubusercontent.com/onbloc/gno-token-resource/main/gno-native/images/gnot.svg',
  name: 'Gnoland',
  symbol: 'GNOT',
  balanceAmount: {
    value: '240,255.241155',
    denom: 'GNOT',
  },
  display: true,
};

export const Main: StoryObj<ManageTokenListItemProps> = {
  args: {
    token: {
      ...token,
      main: true,
    },
    onToggleActiveItem: action('token item click'),
  },
};

export const Activated: StoryObj<ManageTokenListItemProps> = {
  args: {
    token,
    onToggleActiveItem: action('token item click'),
  },
};

export const Deactivated: StoryObj<ManageTokenListItemProps> = {
  args: {
    token: {
      ...token,
      display: false,
    },
    onToggleActiveItem: action('token item click'),
  },
};