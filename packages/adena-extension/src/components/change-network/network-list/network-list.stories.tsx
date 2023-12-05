import NetworkList, { type NetworkListProps } from './network-list';
import { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';

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
      {
        id: 'test2',
        default: true,
        main: true,
        chainId: 'GNOLAND',
        chainName: 'GNO.LAND',
        networkId: 'test2',
        networkName: 'Testnet 2',
        addressPrefix: 'g',
        rpcUrl: 'https://rpc.test3.gno.land',
        gnoUrl: 'https://test3.gno.land',
        apiUrl: 'https://api.adena.app',
        linkUrl: 'https://gnoscan.io',
      },
      {
        id: 'teritori',
        default: false,
        main: false,
        chainId: 'teritori-1',
        chainName: 'Gno Teritori',
        networkId: 'teritori-1',
        networkName: 'Gno Teritori',
        addressPrefix: 'g',
        rpcUrl: 'https://testnet.gno.teritori.com:26658',
        gnoUrl: 'https://testnet.gno.teritori.com',
        apiUrl: '',
        linkUrl: ''
      },
    ],
    changeNetwork: action('changeNetwork'),
    moveEditPage: action('moveEditPage'),
  },
};