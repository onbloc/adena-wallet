import { action } from '@storybook/addon-actions';
import { Meta, StoryObj } from '@storybook/react';
import ChangeNetwork, { type ChangeNetworkProps } from './change-network';

export default {
  title: 'components/change-network/ChangeNetwork',
  component: ChangeNetwork,
} as Meta<typeof ChangeNetwork>;

export const Default: StoryObj<ChangeNetworkProps> = {
  args: {
    loading: false,
    currentNetworkId: 'test3',
    networkMetainfos: [
      {
        id: 'test3',
        default: true,
        main: true,
        chainId: 'chainId',
        chainName: 'Gno.land',
        networkId: 'test3',
        networkName: 'Testnet 3',
        addressPrefix: 'g',
        rpcUrl: 'https://rpc.test3.Gno.land',
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
        chainName: 'Gno.land',
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
    moveAddPage: action('moveAddPage'),
    moveEditPage: action('moveEditPage'),
    moveBack: action('moveBack'),
  },
};
