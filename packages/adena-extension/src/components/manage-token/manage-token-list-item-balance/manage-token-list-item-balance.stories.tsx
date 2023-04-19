import ManageTokenListItemBalance, { type ManageTokenListItemBalanceProps } from './manage-token-list-item-balance';
import { Meta, StoryObj } from '@storybook/react';

export default {
  title: 'components/manage-token/ManageTokenListItemBalance',
  component: ManageTokenListItemBalance,
} as Meta<typeof ManageTokenListItemBalance>;

export const Default: StoryObj<ManageTokenListItemBalanceProps> = {
  args: {
    amount: {
      value: "240,255.241155",
      denom: "GNOT"
    }
  },
};