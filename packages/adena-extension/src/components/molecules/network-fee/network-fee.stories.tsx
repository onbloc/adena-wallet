import { Meta, StoryObj } from '@storybook/react';
import NetworkFee, { type NetworkFeeProps } from './network-fee';

export default {
  title: 'components/common/NetworkFee',
  component: NetworkFee,
} as Meta<typeof NetworkFee>;

export const Default: StoryObj<NetworkFeeProps> = {
  args: {
    value: '0.0048',
    denom: 'GNOT',
  },
};
