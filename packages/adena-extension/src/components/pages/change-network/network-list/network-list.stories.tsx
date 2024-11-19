import { action } from '@storybook/addon-actions';
import { Meta, StoryObj } from '@storybook/react';
import NetworkList, { type NetworkListProps } from './network-list';

export default {
  title: 'components/change-network/NetworkList',
  component: NetworkList,
} as Meta<typeof NetworkList>;

export const Default: StoryObj<NetworkListProps> = {
  args: {
    currentNetworkId: 'test3',
    networkMetainfos: [
      {
        id: 'test3',
        default: true,
        main: true,
        chainId: 'chainId',
        chainName: 'GNO.LAND',
        networkId: 'test3',
        networkName: 'Testnet 3',
        addressPrefix: 'g',
        rpcUrl: 'https://rpc.test3.gno.land',
        indexerUrl: '',
        gnoUrl: 'https://test3.gno.land',
        apiUrl: 'https://api.adena.app',
        linkUrl: 'https://gnoscan.io',
      },
      {
        id: 'test2',
        default: true,
        main: true,
        chainId: 'chainId',
        chainName: 'GNO.LAND',
        networkId: 'test2',
        networkName: 'Testnet 2',
        addressPrefix: 'g',
        rpcUrl: 'https://rpc.test3.gno.land',
        indexerUrl: '',
        gnoUrl: 'https://test3.gno.land',
        apiUrl: 'https://api.adena.app',
        linkUrl: 'https://gnoscan.io',
      },
    ],
    changeNetwork: action('changeNetwork'),
    moveEditPage: action('moveEditPage'),
  },
};
