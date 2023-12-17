import NetworkListItem, { type NetworkListItemProps } from './network-list-item';
import { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';

export default {
  title: 'components/change-network/NetworkListItem',
  component: NetworkListItem,
} as Meta<typeof NetworkListItem>;

export const Default: StoryObj<NetworkListItemProps> = {
  args: {
    selected: true,
    locked: true,
    networkMetainfo: {
      id: 'test3',
      default: true,
      main: true,
      chainId: 'GNOLAND',
      chainName: 'GNO.LAND',
      networkId: 'test3',
      networkName: 'Testnet 3',
      addressPrefix: 'g',
      rpcUrl: 'https://rpc.test3.gno.land',
      gnoUrl: 'https://test3.gno.land',
      apiUrl: 'https://api.adena.app',
      linkUrl: 'https://gnoscan.io',
    },
    moveEditPage: action('moveEditNetwork'),
    changeNetwork: action('changeNetwork'),
  },
};