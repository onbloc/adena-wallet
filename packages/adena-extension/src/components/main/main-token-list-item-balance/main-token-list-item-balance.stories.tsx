import MainTokenListItemBalance, { type MainTokenListItemBalanceProps } from './main-token-list-item-balance';
import { Meta, StoryObj } from '@storybook/react';

export default {
  title: 'components/main/MainTokenListItemBalance',
  component: MainTokenListItemBalance,
} as Meta<typeof MainTokenListItemBalance>;

export const Default: StoryObj<MainTokenListItemBalanceProps> = {
  args: {
    amount: {
      value: "240,255.241155",
      denom: "GNOT"
    }
  },
};