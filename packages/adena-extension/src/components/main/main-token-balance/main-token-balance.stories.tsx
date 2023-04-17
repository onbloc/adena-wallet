import MainTokenBalance, { type MainTokenBalanceProps } from './main-token-balance';
import { Meta, StoryObj } from '@storybook/react';

export default {
  title: 'components/main/MainTokenBalance',
  component: MainTokenBalance,
} as Meta<typeof MainTokenBalance>;

export const Default: StoryObj<MainTokenBalanceProps> = {
  args: {
    amount: {
      value: "240,255.241155",
      denom: "GNOT"
    }
  },
};