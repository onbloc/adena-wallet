import MainNetworkLabel, { type MainNetworkLabelProps } from './main-network-label';
import { Meta, StoryObj } from '@storybook/react';

export default {
  title: 'components/main/MainNetworkLabel',
  component: MainNetworkLabel,
} as Meta<typeof MainNetworkLabel>;

export const Default: StoryObj<MainNetworkLabelProps> = {
  args: {
    networkName: 'Test3',
  },
};
