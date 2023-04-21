import BalanceInput, { type BalanceInputProps } from './balance-input';
import { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';

export default {
  title: 'components/transfer/BalanceInput',
  component: BalanceInput,
} as Meta<typeof BalanceInput>;

export const Default: StoryObj<BalanceInputProps> = {
  args: {
    hasError: false,
    amount: '132123123123',
    denom: 'GNOT',
    description: 'Insufficient balance',
    onChangeAmount: action('change amount'),
    onClickMax: action('click max button'),
  },
};