import { TokenBalance, type TokenBalanceProps } from '.';
import { Meta, StoryObj } from '@storybook/react';

export default {
  title: 'components/common/TokenBalance',
  component: TokenBalance,
} as Meta<typeof TokenBalance>;

export const VerticalTokenBalance: StoryObj<TokenBalanceProps> = {
  args: {
    value: '123,456,789.123456',
    denom: 'GNOS',
    orientation: 'VERTICAL',
    fontStyleKey: 'header6',
    fontColor: 'white',
    minimumFontSize: '14px',
  },
};

export const HorizontalTokenBalance: StoryObj<TokenBalanceProps> = {
  args: {
    value: '123,456,789.123456',
    denom: 'GNOS',
    orientation: 'HORIZONTAL',
    fontStyleKey: 'header6',
    fontColor: 'white',
    minimumFontSize: '14px',
  },
};
