import NetworkListItem, { type NetworkListItemProps } from './network-list-item';
import { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import CHAIN_DATA from '@resources/chains/chains.json';

export default {
  title: 'components/change-network/NetworkListItem',
  component: NetworkListItem,
} as Meta<typeof NetworkListItem>;

export const Default: StoryObj<NetworkListItemProps> = {
  args: {
    selected: true,
    locked: true,
    networkMetainfo: CHAIN_DATA[0],
    moveEditPage: action('moveEditNetwork'),
    changeNetwork: action('changeNetwork'),
  },
};
