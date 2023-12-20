import AdditionalTokenInfo, { type AdditionalTokenInfoProps } from './additional-token-info';
import { Meta, StoryObj } from '@storybook/react';

export default {
  title: 'components/manage-token/AdditionalTokenInfo',
  component: AdditionalTokenInfo,
} as Meta<typeof AdditionalTokenInfo>;

export const Default: StoryObj<AdditionalTokenInfoProps> = {
  args: {
    symbol: 'GNOT',
    path: 'gno.land/gnot',
    decimals: '6',
  },
};