import TokenListItemBalance, { type TokenListItemBalanceProps } from './token-list-item-balance';
import { Meta, StoryObj } from '@storybook/react';

export default {
  title: 'components/common/TokenListItemBalance',
  component: TokenListItemBalance,
} as Meta<typeof TokenListItemBalance>;

export const Default: StoryObj<TokenListItemBalanceProps> = {
  args: {
    amount: {
      value: '240,255.241155',
      denom: 'GNOT',
    },
  },
};

export const WithPrice: StoryObj<TokenListItemBalanceProps> = {
  args: {
    amount: {
      value: '640,315.512321',
      denom: 'PHOTON',
    },
    usdDisplay: true,
    tokenValue: {
      usdValue: 2120252.23,
      change24h: 3.29,
    },
  },
};

export const UnquotedInUSDMode: StoryObj<TokenListItemBalanceProps> = {
  args: {
    amount: {
      value: '640,315.512321',
      denom: 'PHOTON',
    },
    usdDisplay: true,
  },
};
