import { action } from '@storybook/addon-actions';
import { Meta, StoryObj } from '@storybook/react';
import TokenList, { type TokenListProps } from './token-list';

export default {
  title: 'components/common/TokenList',
  component: TokenList,
} as Meta<typeof TokenList>;

const tokens = [
  {
    tokenId: 'token1',
    logo: 'https://raw.githubusercontent.com/onbloc/gno-token-resource/main/gno-native/images/gnot.svg',
    name: 'gno.land',
    balanceAmount: {
      value: '240,255.241155',
      denom: 'GNOT',
    },
  },
  {
    tokenId: 'token2',
    logo: 'https://avatars.githubusercontent.com/u/118414737?s=200&v=4',
    name: 'Gnoswap',
    balanceAmount: {
      value: '252.844',
      denom: 'GNOS',
    },
  },
];

export const Default: StoryObj<TokenListProps> = {
  args: {
    tokens,
    onClickTokenItem: action('token item click'),
  },
};
