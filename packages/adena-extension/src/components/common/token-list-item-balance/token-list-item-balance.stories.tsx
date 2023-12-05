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
