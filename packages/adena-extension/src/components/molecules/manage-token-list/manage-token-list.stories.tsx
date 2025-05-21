import { action } from '@storybook/addon-actions';
import { Meta, StoryObj } from '@storybook/react';
import ManageTokenList, { type ManageTokenListProps } from './manage-token-list';

export default {
  title: 'components/manage-token/ManageTokenList',
  component: ManageTokenList,
} as Meta<typeof ManageTokenList>;

const tokens = [
  {
    tokenId: 'token1',
    type: 'token' as const,
    symbol: 'GNOT',
    logo: 'https://raw.githubusercontent.com/onbloc/gno-token-resource/main/gno-native/images/gnot.svg',
    name: 'Gnoland',
    balance: {
      value: '240,255.241155',
      denom: 'GNOT',
    },
    activated: true,
  },
  {
    tokenId: 'token2',
    type: 'token' as const,
    symbol: 'GNS',
    logo: 'https://avatars.githubusercontent.com/u/118414737?s=200&v=4',
    name: 'GnoSwap',
    balance: {
      value: '252.844',
      denom: 'GNS',
    },
    activated: true,
  },
];

export const Default: StoryObj<ManageTokenListProps> = {
  args: {
    tokens,
    onToggleActiveItem: action('token item click'),
  },
};
