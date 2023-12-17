import TokenListItem, { type TokenListItemProps } from './token-list-item';
import { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';

export default {
  title: 'components/common/TokenListItem',
  component: TokenListItem,
} as Meta<typeof TokenListItem>;

const token = {
  tokenId: 'token1',
  logo: 'https://raw.githubusercontent.com/onbloc/gno-token-resource/main/gno-native/images/gnot.svg',
  name: 'Gnoland',
  balanceAmount: {
    value: '240,255.241155',
    denom: 'GNOT',
  },
};

export const Default: StoryObj<TokenListItemProps> = {
  args: {
    token,
    onClickTokenItem: action('token item click'),
  },
};
