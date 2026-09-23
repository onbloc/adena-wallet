import { Meta, StoryObj } from '@storybook/react';
import MainTotalPrice, { type MainTotalPriceProps } from './main-total-price';

export default {
  title: 'components/main/MainTotalPrice',
  component: MainTotalPrice,
} as Meta<typeof MainTotalPrice>;

export const Default: StoryObj<MainTotalPriceProps> = {
  args: {
    value: {
      totalUSDValue: 100278210.38,
      changeUSDValue: 125.02,
      changeRate: 15.25,
    },
  },
};

export const Negative: StoryObj<MainTotalPriceProps> = {
  args: {
    value: {
      totalUSDValue: 1204.5,
      changeUSDValue: -32.18,
      changeRate: -2.6,
    },
  },
};

export const Unchanged: StoryObj<MainTotalPriceProps> = {
  args: {
    value: {
      totalUSDValue: 1204.5,
      changeUSDValue: 0,
      changeRate: 0,
    },
  },
};
