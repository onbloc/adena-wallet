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
    networkMode: 'mainnet',
    sections: [
      {
        chainGroup: 'gno',
        displayName: 'Gno.land',
        networks: [
          {
            id: 'gnoland1',
            default: true,
            main: true,
            chainId: 'gnoland1',
            chainName: 'Gno.land',
            networkId: 'gnoland1',
            networkName: 'Mainnet Beta',
            addressPrefix: 'g',
            rpcUrl: 'https://rpc.gno.land',
            indexerUrl: '',
            gnoUrl: '',
            apiUrl: '',
            linkUrl: '',
          },
        ],
        selectedNetworkId: 'gnoland1',
        canAdd: false,
      },
      {
        chainGroup: 'atomone',
        displayName: 'AtomOne',
        networks: [
          {
            id: 'atomone-1',
            default: true,
            isMainnet: true,
            chainGroup: 'atomone',
            chainType: 'cosmos',
            chainId: 'atomone-1',
            chainName: 'AtomOne',
            networkId: 'atomone-1',
            networkName: 'Mainnet',
            addressPrefix: 'atone',
            rpcUrl: 'https://atomone-rpc.allinbits.com',
            restUrl: 'https://atomone-api.allinbits.com',
          },
        ],
        selectedNetworkId: 'atomone-1',
        canAdd: false,
      },
    ],
    onChangeMode: action('onChangeMode'),
    onSelect: action('onSelect'),
    onEdit: action('onEdit'),
    onAdd: action('onAdd'),
    moveBack: action('moveBack'),
  },
};
