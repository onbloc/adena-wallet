import { Meta, StoryObj } from '@storybook/react';
import NetworkFeeCustomInput, { type NetworkFeeCustomInputProps } from './network-fee-custom-input';

export default {
  title: 'components/common/NetworkFeeCustomInput',
  component: NetworkFeeCustomInput,
} as Meta<typeof NetworkFeeCustomInput>;

export const Default: StoryObj<NetworkFeeCustomInputProps> = {
  args: {
    value: '0.0048',
  },
};
